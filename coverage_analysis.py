"""
Coverage Analysis Module

This module implements the functionality from notebooks/coverage_new.py,
providing analysis of how different sublimits impact insurance premiums.
It uses SHAP values to determine feature importance and visualize
the impact of different sublimits on premium pricing.
"""

import os
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

# Global variables to store precomputed results
_model = None
_shap_values_df = None
_submission_df = None
_quotes_df = None
_common_feats = None

# Paths to data files (relative to project root)
SUBMISSION_PATH = "notebooks/Submission_ML-Ready_Format.csv"
QUOTES_PATH = "notebooks/adjusted_ml_ready_quotes.xlsx"


def format_feature_name(feature: str) -> str:
    """
    Convert a raw feature name such as:
        "flood_outside_of_high_hazard_flood_zones_amount"
    into a human-friendly format:
        "Flood Outside Of High Hazard Flood Zones"
    """
    if not feature or not isinstance(feature, str):
        return "Unknown Feature"

    name_no_underscores = feature.replace("_", " ").strip()
    if name_no_underscores.lower().endswith(" amount"):
        name_no_underscores = name_no_underscores[: -len(" amount")].strip()
    return name_no_underscores.title()


def load_data():
    """Load submission and quotes data"""
    try:
        # Load submission data
        submission_df = pd.read_csv("data/Submission_ML-Ready_Format.csv")

        # Load quotes data
        quotes_df = pd.read_excel("data/adjusted_ml_ready_quotes.xlsx")

        return submission_df, quotes_df
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None, None


def preprocess_data():
    """
    Preprocess the data for modeling:
    - Identify premium column in quotes
    - One-hot encode categorical features
    - Align features between submission and quotes data

    Returns:
      - sub_processed: Processed submission data
      - quotes_processed: Processed quotes data
      - premium_col: Name of the premium column
      - common_feats: Common features between datasets
      - carriers: Carrier information
    """
    global _common_feats

    # Load data if not already loaded
    submission_df, quotes_df = load_data()

    # Identify premium column
    premium_candidates = [col for col in quotes_df.columns if "premium" in col]
    if not premium_candidates:
        raise ValueError("Could not find a premium column in quotes_df.")
    premium_col = premium_candidates[0]

    # Extract carrier information if available
    if "carrier" in quotes_df.columns:
        carriers = quotes_df["carrier"].copy()
        quotes_df_proc = quotes_df.drop(columns=["carrier"])
    else:
        carriers = None
        quotes_df_proc = quotes_df.copy()

    # Get categorical columns for both dataframes
    cat_cols_sub = [
        col for col in submission_df.columns if submission_df[col].dtype == "object"
    ]
    cat_cols_quotes = [
        col for col in quotes_df_proc.columns if quotes_df_proc[col].dtype == "object"
    ]

    # Union of categorical columns from both dataframes
    union_cats = sorted(set(cat_cols_sub) | set(cat_cols_quotes))

    # One-hot encode categorical features
    if union_cats:
        submission_cat_df = submission_df.reindex(columns=union_cats, fill_value="")
        quotes_cat_df = quotes_df_proc.reindex(columns=union_cats, fill_value="")
        submission_cat_df = submission_cat_df.astype(str)
        quotes_cat_df = quotes_cat_df.astype(str)

        # One-Hot Encode using the union of categorical columns
        encoder = OneHotEncoder(handle_unknown="ignore")
        combined_cat = pd.concat(
            [submission_cat_df, quotes_cat_df], axis=0, ignore_index=True
        )
        encoder.fit(combined_cat)

        encoded_sub = encoder.transform(submission_cat_df).toarray()
        encoded_quotes = encoder.transform(quotes_cat_df).toarray()
        encoded_feature_names = encoder.get_feature_names_out(union_cats)

        sub_enc_df = pd.DataFrame(encoded_sub, columns=encoded_feature_names)
        quotes_enc_df = pd.DataFrame(encoded_quotes, columns=encoded_feature_names)
    else:
        sub_enc_df = pd.DataFrame(index=submission_df.index)
        quotes_enc_df = pd.DataFrame(index=quotes_df_proc.index)

    # Get numeric columns (all columns not in union_cats)
    submission_numeric = submission_df.drop(columns=union_cats, errors="ignore")
    quotes_numeric = quotes_df_proc.drop(columns=union_cats, errors="ignore")

    # Concatenate one-hot encoded data with numeric data
    sub_processed = pd.concat([sub_enc_df, submission_numeric], axis=1)
    quotes_processed = pd.concat([quotes_enc_df, quotes_numeric], axis=1)

    # Ensure feature alignment: use only common columns
    common_feats = list(set(sub_processed.columns) & set(quotes_processed.columns))
    sub_processed = sub_processed[common_feats]
    quotes_processed = quotes_processed[common_feats]

    # Store common features for reuse
    _common_feats = common_feats

    return (
        sub_processed,
        quotes_processed,
        premium_col,
        quotes_df_proc,
        common_feats,
        carriers,
    )


def train_model():
    """
    Train a RandomForestRegressor using quotes data to predict premiums.
    Returns the trained model and the training data.
    """
    global _model

    # If model already trained, return it
    if _model is not None:
        # We need quotes_processed for computing SHAP values
        _, quotes_processed, premium_col, quotes_df_proc, _, _ = preprocess_data()
        X_train, X_test, y_train, y_test = train_test_split(
            quotes_processed,
            quotes_df_proc[premium_col],
            test_size=0.2,
            random_state=42,
        )
        return _model, X_train

    # Preprocess data
    _, quotes_processed, premium_col, quotes_df_proc, _, _ = preprocess_data()

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        quotes_processed, quotes_df_proc[premium_col], test_size=0.2, random_state=42
    )

    # Train model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Store model for reuse
    _model = model

    return model, X_train


def compute_mean_shap_values():
    """
    Compute the mean SHAP value for each feature over all samples.
    Returns a DataFrame with columns: Feature, MeanSHAP, and AbsMeanSHAP.
    """
    global _shap_values_df

    # If SHAP values already computed, return them
    if _shap_values_df is not None:
        return _shap_values_df

    # Get model and training data
    model, X_train = train_model()

    # Compute SHAP values
    explainer = shap.Explainer(model, X_train)
    shap_values = explainer(X_train)
    mean_shap = shap_values.values.mean(axis=0)

    # Create DataFrame
    data = []
    for i, col in enumerate(X_train.columns):
        data.append(
            {"Feature": col, "MeanSHAP": mean_shap[i], "AbsMeanSHAP": abs(mean_shap[i])}
        )

    df = pd.DataFrame(data)
    df.sort_values(by="AbsMeanSHAP", ascending=False, inplace=True)

    # Store SHAP values for reuse
    _shap_values_df = df

    return df


def combine_small_features(df, top_n=10):
    """
    Keep the top_n features (by absolute mean SHAP) and combine the rest into an 'Other' category.
    """
    if len(df) <= top_n:
        return df

    top = df.head(top_n).copy()
    others = df.iloc[top_n:].copy()
    sum_mean = others["MeanSHAP"].sum()
    sum_abs = others["AbsMeanSHAP"].sum()

    other_row = pd.DataFrame(
        {"Feature": ["Other"], "MeanSHAP": [sum_mean], "AbsMeanSHAP": [sum_abs]}
    )

    top = pd.concat([top, other_row], ignore_index=True)
    return top


def generate_exec_summary(df_or_features, step):
    """
    Generate an executive summary of the most impactful features.

    Parameters:
    - df_or_features: Either a DataFrame with SHAP values or a list of feature dictionaries from get_feature_impact
    - step: Sublimit increase step size

    Returns:
    - List of strings with executive summary
    """
    # Handle both DataFrame input and list of dictionaries input
    if isinstance(df_or_features, pd.DataFrame):
        # Original input is DataFrame
        sorted_df = df_or_features.copy()
        sorted_df["ScaledMeanSHAP"] = sorted_df["MeanSHAP"] * step
        sorted_df["AbsScaledMeanSHAP"] = sorted_df["AbsMeanSHAP"] * step
        sorted_df = sorted_df.sort_values(by="AbsScaledMeanSHAP", ascending=False)
    else:
        # Input is list of dictionaries from get_feature_impact()
        # Convert to DataFrame for processing
        sorted_df = pd.DataFrame(
            [
                {
                    "Feature": item["feature"],
                    "ScaledMeanSHAP": item["scaledMeanShap"],
                    "AbsScaledMeanSHAP": item["absScaledMeanShap"],
                }
                for item in df_or_features
            ]
        )

    # Prepare summary lines
    summary = []
    summary.append(f"EXECUTIVE SUMMARY (per ${step:,} change in sublimit):")
    summary.append("")

    # Add top positive impacts
    positives = sorted_df[sorted_df["ScaledMeanSHAP"] > 0].head(3)
    if not positives.empty:
        summary.append("Most Significant Premium Increases:")
        for _, row in positives.iterrows():
            feature_name = format_feature_name(row["Feature"])
            impact = row["ScaledMeanSHAP"]
            summary.append(f"- {feature_name}: +${impact:.2f}")
        summary.append("")

    # Add top negative impacts
    negatives = (
        sorted_df[sorted_df["ScaledMeanSHAP"] < 0]
        .sort_values(by="ScaledMeanSHAP")
        .head(3)
    )
    if not negatives.empty:
        summary.append("Most Significant Premium Decreases:")
        for _, row in negatives.iterrows():
            feature_name = format_feature_name(row["Feature"])
            impact = abs(row["ScaledMeanSHAP"])
            summary.append(f"- {feature_name}: -${impact:.2f}")

    return summary


def get_feature_impact(step=10000, top_n=10):
    """
    Get the top features by SHAP impact, scaled by the given step amount.
    This is the main API function for the Global Impact tab.
    """
    # Compute SHAP values if not already computed
    df_mean_shap = compute_mean_shap_values()

    # Get top features
    df_top = combine_small_features(df_mean_shap, top_n=top_n)

    # Scale values by step
    result = df_top.copy()
    result["ScaledMeanSHAP"] = result["MeanSHAP"] * step
    result["AbsScaledMeanSHAP"] = result["AbsMeanSHAP"] * step
    result["Sign"] = result["ScaledMeanSHAP"].apply(
        lambda x: "Positive" if x > 0 else "Negative"
    )
    result["FeatureName"] = result["Feature"].apply(lambda x: format_feature_name(x))

    # Convert to dictionary for JSON serialization
    features = []
    for _, row in result.iterrows():
        features.append(
            {
                "feature": row["Feature"],
                "featureName": row["FeatureName"],
                "meanShap": float(row["MeanSHAP"]),
                "scaledMeanShap": float(row["ScaledMeanSHAP"]),
                "absScaledMeanShap": float(row["AbsScaledMeanSHAP"]),
                "sign": row["Sign"],
            }
        )

    return features


def get_available_sublimits():
    """
    Get a list of available sublimits for the comparison view.
    This is an API function for the Quotes vs Submission tab.
    """
    # Load data if not already loaded
    submission_df, _ = load_data()

    # Find sublimit columns (assumed to contain "amount" in the name)
    sublimit_cols = [col for col in submission_df.columns if "amount" in col.lower()]

    return sublimit_cols


def get_quotes_vs_submission(selected_sublimit):
    """
    Get comparison data for the selected sublimit.
    This is the main API function for the Quotes vs Submission tab.
    """
    print(f"Processing sublimit in get_quotes_vs_submission: '{selected_sublimit}'")

    # Load data if not already loaded
    submission_df, quotes_df = load_data()

    # Print column name debug info
    submission_cols = list(submission_df.columns)
    quotes_cols = list(quotes_df.columns)
    print(f"Submission dataframe has {len(submission_cols)} columns")
    print(f"Quotes dataframe has {len(quotes_cols)} columns")

    # Extract carrier information if available
    carriers = quotes_df["carrier"].copy() if "carrier" in quotes_df.columns else None

    # Check if sublimit exists in both dataframes with detailed error info
    if selected_sublimit not in submission_df.columns:
        similar_cols = [
            col
            for col in submission_df.columns
            if selected_sublimit.replace("_", " ") in col
        ]
        error_msg = f"Sublimit '{selected_sublimit}' not found in submission dataset."
        if similar_cols:
            error_msg += f" Similar columns: {similar_cols[:3]}"
        print(error_msg)
        return {"error": error_msg}

    if selected_sublimit not in quotes_df.columns:
        similar_cols = [
            col
            for col in quotes_df.columns
            if selected_sublimit.replace("_", " ") in col
        ]
        error_msg = f"Sublimit '{selected_sublimit}' not found in quotes dataset."
        if similar_cols:
            error_msg += f" Similar columns: {similar_cols[:3]}"
        print(error_msg)
        return {"error": error_msg}

    # Get values
    submission_value = submission_df[selected_sublimit].iloc[0]
    quote_values = quotes_df[selected_sublimit].values

    print(
        f"Found submission value: {submission_value} and {len(quote_values)} quote values for sublimit: '{selected_sublimit}'"
    )

    # Create comparison data
    comparison = []
    for i, quote_value in enumerate(quote_values):
        item = {
            "quote": i,
            "quoteValue": float(quote_value),
            "submissionValue": float(submission_value),
            "difference": float(quote_value - submission_value),
        }

        if carriers is not None:
            item["carrier"] = carriers.iloc[i]

        comparison.append(item)

    return {
        "sublimit": selected_sublimit,
        "formattedName": format_feature_name(selected_sublimit),
        "comparison": comparison,
    }


def get_feature_impact_detailed(step=10000, top_n=10):
    """
    Get detailed feature impact data for visualization.
    Includes base value, distribution data, and feature contributions.
    """
    # Get model and data
    model, X_train = train_model()

    # Compute SHAP values if not already computed
    df_mean_shap = compute_mean_shap_values()

    # Get top features
    df_top = combine_small_features(df_mean_shap, top_n=top_n)

    # Calculate base value (average prediction)
    _, quotes_processed, premium_col, quotes_df_proc, _, _ = preprocess_data()
    base_value = quotes_df_proc[premium_col].mean()

    # Scale values by step
    features = []
    total_contribution = 0

    for _, row in df_top.iterrows():
        if row["Feature"] == "Other":
            continue

        # Scale by step size
        contribution = float(row["MeanSHAP"] * step)
        total_contribution += contribution

        # Get representative value for this feature
        feature_value = "N/A"

        # Try to get a typical value from quotes data
        if row["Feature"] in quotes_processed.columns:
            feature_values = quotes_processed[row["Feature"]]
            if len(feature_values) > 0:
                if feature_values.dtype == "object":
                    feature_value = feature_values.mode()[0]
                else:
                    # For numeric features, use median
                    feature_value = f"{feature_values.median():,.0f}"

        # Format the feature
        features.append(
            {
                "feature_name": row["Feature"],
                "display_name": format_feature_name(row["Feature"]),
                "value": feature_value,
                "contribution": contribution,
                "abs_contribution": abs(contribution),
                "is_positive": contribution > 0,
            }
        )

    # Sort by absolute contribution
    features.sort(key=lambda x: x["abs_contribution"], reverse=True)

    # Calculate final value
    final_value = base_value + total_contribution

    # Generate distribution data (simplified)
    # In a real implementation, this would use actual distribution of predictions
    # Here we'll generate synthetic data based on the base value
    distribution = []
    dist_values = np.random.normal(base_value, base_value * 0.2, 100)
    # Convert to histogram data
    hist, bin_edges = np.histogram(dist_values, bins=20)
    for i in range(len(hist)):
        distribution.append({"value": float(bin_edges[i]), "count": int(hist[i])})

    return {
        "base_value": float(base_value),
        "final_value": float(final_value),
        "features": features,
        "distribution": distribution,
    }
