import streamlit as st
import altair as alt
import pandas as pd
import numpy as np
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder


###############################################################################
# 1. Helper Function for Formatting Feature Names
###############################################################################
def format_feature_name(feature: str) -> str:
    """
    Convert a raw feature name such as:
        "flood_outside_of_high_hazard_flood_zones_amount"
    into a human-friendly format:
        "Flood Outside Of High Hazard Flood Zones"
    """
    name_no_underscores = feature.replace("_", " ").strip()
    if name_no_underscores.lower().endswith(" amount"):
        name_no_underscores = name_no_underscores[: -len(" amount")].strip()
    return name_no_underscores.title()


###############################################################################
# 2. Data Loading & Preprocessing (Using Actual Underlying Data)
###############################################################################
def load_data():
    """
    Load submission and quotes data from your actual files.
    """
    submission_df = pd.read_csv("Submission_ML-Ready_Format.csv")
    quotes_df = pd.read_excel("adjusted_ml_ready_quotes.xlsx")

    submission_df.fillna(0, inplace=True)
    quotes_df.fillna(0, inplace=True)

    # Standardize column names
    submission_df.columns = submission_df.columns.str.strip().str.lower()
    quotes_df.columns = quotes_df.columns.str.strip().str.lower()
    return submission_df, quotes_df


def preprocess_data(submission_df, quotes_df):
    """
    Identify the premium column in quotes, remove the 'carrier' column (if present)
    so that all sublimits are used as features, and then convert remaining categorical
    columns to strings and one-hot encode them using the union of all categorical columns.

    Returns:
      - sub_processed: Processed submission data (for baseline)
      - quotes_processed: Processed quotes data (features for training)
      - premium_col: Name of the premium column in quotes_df
      - quotes_df_proc: The quotes DataFrame with the 'carrier' column removed (if it existed)
      - common_feats: List of common features between submission and quotes data
      - carriers: A Series containing the carrier information from quotes_df (if available)
    """
    # Identify premium column
    premium_candidates = [col for col in quotes_df.columns if "premium" in col]
    if not premium_candidates:
        raise ValueError("Could not find a premium column in quotes_df.")
    premium_col = premium_candidates[0]

    # If 'carrier' exists in quotes, store it and remove it from features
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

    if union_cats:
        # For each DataFrame, ensure all union columns exist; fill missing with empty string.
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
        encoded_feature_names = []

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

    return (
        sub_processed,
        quotes_processed,
        premium_col,
        quotes_df_proc,
        common_feats,
        carriers,
    )


###############################################################################
# 3. Model Training & SHAP Value Computation
###############################################################################
def train_model(quotes_processed, quotes_df, premium_col):
    """
    Train a RandomForestRegressor using the quotes data and the identified premium column.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        quotes_processed, quotes_df[premium_col], test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    return model, X_train


def compute_mean_shap_values(model, X):
    """
    Compute the mean SHAP value for each feature over all samples.
    Returns a DataFrame with columns: Feature, MeanSHAP, and AbsMeanSHAP.
    """
    explainer = shap.Explainer(model, X)
    shap_values = explainer(X)  # shape: (num_samples, num_features)
    mean_shap = shap_values.values.mean(axis=0)  # preserving sign
    data = []
    for i, col in enumerate(X.columns):
        data.append(
            {"Feature": col, "MeanSHAP": mean_shap[i], "AbsMeanSHAP": abs(mean_shap[i])}
        )
    df = pd.DataFrame(data)
    df.sort_values(by="AbsMeanSHAP", ascending=False, inplace=True)
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
    sum_abs = others["AbsMeanSHAP"].sum()  # approximate aggregate magnitude
    other_row = pd.DataFrame(
        {"Feature": ["Other"], "MeanSHAP": [sum_mean], "AbsMeanSHAP": [sum_abs]}
    )
    top = pd.concat([top, other_row], ignore_index=True)
    return top


###############################################################################
# 4. Plotting the Diverging Bar Chart (Global Mean SHAP)
###############################################################################
def plot_diverging_mean_shap(df, step):
    """
    Create a horizontal diverging bar chart (using Altair) that shows the scaled mean SHAP value for each feature.
    Parameters:
      - df: DataFrame with columns "Feature", "MeanSHAP", and "AbsMeanSHAP".
      - step: The sublimit increase step (in dollars).
    """
    df = df.copy()
    # Scale the mean SHAP values by the chosen step
    df["ScaledMeanSHAP"] = df["MeanSHAP"] * step
    df["AbsScaledMeanSHAP"] = df["AbsMeanSHAP"] * step
    df["Sign"] = df["ScaledMeanSHAP"].apply(
        lambda x: "Positive" if x > 0 else "Negative"
    )
    # Create a human-friendly feature name
    df["FeatureName"] = df["Feature"].apply(lambda x: format_feature_name(x))
    # Sort so that the most impactful features (by absolute scaled value) appear at the top
    df = df.sort_values(by="AbsScaledMeanSHAP", ascending=True)
    chart = (
        alt.Chart(df)
        .mark_bar()
        .encode(
            y=alt.Y("FeatureName:N", sort=None, title="Sublimit Feature"),
            x=alt.X(
                "ScaledMeanSHAP:Q",
                title=f"Impact on Premium (per ${step:,.0f} increase)",
                axis=alt.Axis(format="$,.2f"),
            ),
            color=alt.Color(
                "Sign:N",
                scale=alt.Scale(
                    domain=["Positive", "Negative"], range=["#E74C3C", "#2E86AB"]
                ),
            ),
            tooltip=[
                alt.Tooltip("FeatureName:N", title="Feature"),
                alt.Tooltip(
                    "MeanSHAP:Q", title="Mean SHAP (per $1 increase)", format=".4f"
                ),
                alt.Tooltip(
                    "ScaledMeanSHAP:Q",
                    title=f"Impact (per ${step:,.0f} increase)",
                    format="$,.2f",
                ),
            ],
        )
        .properties(width=350, height=300)
    )
    rule = alt.Chart(pd.DataFrame({"x": [0]})).mark_rule(color="black").encode(x="x:Q")
    return chart + rule


def create_absolute_impact_table(df, step):
    """
    Create a table (DataFrame) that shows the absolute impact on premium (in dollars)
    for each sublimit. The table is formatted with a human-friendly feature name and the impact value.
    """
    df = df.copy()
    # Scale the SHAP values and take absolute value
    df["AbsScaledMeanSHAP"] = df["AbsMeanSHAP"] * step
    df["FeatureName"] = df["Feature"].apply(lambda x: format_feature_name(x))
    table_df = df[["FeatureName", "AbsScaledMeanSHAP"]].copy()
    table_df.rename(
        columns={
            "FeatureName": "Feature",
            "AbsScaledMeanSHAP": f"Absolute Impact (per ${step:,.0f} increase)",
        },
        inplace=True,
    )
    return table_df


###############################################################################
# 5. Executive Summary Generation (Plain Text)
###############################################################################
def generate_exec_summary(df, step):
    """
    Generate an executive summary as a list of plain-text sentences for each feature.
    For example:
      "Earthquake Coverage: For every $10,000 increase, premium decreases by $450.00."
    """
    summary_lines = []
    df_sorted = df.sort_values(by="AbsMeanSHAP", ascending=False)
    for idx, row in df_sorted.iterrows():
        feature_name = format_feature_name(row["Feature"])
        impact = row["MeanSHAP"] * step
        direction = "increases" if impact > 0 else "decreases"
        summary_line = f"{feature_name}: For every ${step:,.0f} increase, premium {direction} by ${abs(impact):,.2f}."
        summary_lines.append(summary_line)
    return summary_lines


###############################################################################
# 7. New Tab: Quotes vs Submission Comparison
###############################################################################
def quotes_vs_submission_tab(submission_df_orig, quotes_df_orig, carriers):
    """
    Create a tab that compares the sublimit values of all quotes to the submission.
    Assumes that sublimit columns contain "amount" in their name.
    If submission_df_orig has only one row, that row is used as the reference.
    """
    st.write("## Quotes vs Submission Comparison")

    # Extract sublimit columns (assume these columns contain "amount")
    sublimit_cols = [
        col for col in submission_df_orig.columns if "amount" in col.lower()
    ]
    if not sublimit_cols:
        st.write("No sublimit columns found.")
        return

    # Let user select a sublimit to compare
    selected_sublimit = st.selectbox(
        "Select Sublimit to Compare", sublimit_cols, format_func=format_feature_name
    )

    # Get the submission value (assume submission has one row)
    submission_value = submission_df_orig[selected_sublimit].iloc[0]

    # Get quote values for the selected sublimit
    # Use the original quotes data (before any processing)
    quote_values = quotes_df_orig[selected_sublimit]

    # Create a DataFrame for comparison
    comp_df = pd.DataFrame(
        {
            "Quote": quote_values.index,
            "Quote Value": quote_values,
        }
    )
    # If carriers are available, add them
    if carriers is not None:
        comp_df["Carrier"] = carriers.values
    comp_df["Submission Value"] = submission_value
    comp_df["Difference"] = comp_df["Quote Value"] - submission_value

    st.write(f"### Comparison for {format_feature_name(selected_sublimit)}")
    st.dataframe(comp_df)

    # Create a bar chart comparing quote values to submission value
    chart = (
        alt.Chart(comp_df)
        .mark_bar()
        .encode(
            x=alt.X(
                "Quote Value:Q", title=f"{format_feature_name(selected_sublimit)} Value"
            ),
            y=alt.Y(
                "Carrier:N" if "Carrier" in comp_df.columns else "Quote:N",
                title="Quote",
            ),
            tooltip=[
                "Quote",
                "Carrier",
                "Quote Value",
                "Submission Value",
                "Difference",
            ],
        )
    )
    # Add a vertical rule for submission value
    rule = (
        alt.Chart(pd.DataFrame({"x": [submission_value]}))
        .mark_rule(color="black")
        .encode(x="x:Q")
    )
    st.altair_chart(chart + rule, use_container_width=True)
    st.write(
        f"Submission value for {format_feature_name(selected_sublimit)}: ${submission_value:,.2f}"
    )


###############################################################################
# 8. Streamlit App: Main
###############################################################################
def main():
    # Use st.tabs to create two tabs: one for Global Impact and one for Quotes vs Submission
    tabs = st.tabs(["Global Impact", "Quotes vs Submission"])

    # Load original data (for comparison tab, we need the original numeric data)
    submission_df_orig, quotes_df_orig = load_data()

    # Preprocess data for modeling (carrier removed)
    sub_proc, quotes_proc, premium_col, quotes_df_proc, common_feats, carriers = (
        preprocess_data(submission_df_orig.copy(), quotes_df_orig.copy())
    )

    # Train model on quotes data
    model, X_train = train_model(quotes_proc, quotes_df_proc, premium_col)

    with tabs[0]:
        st.title("Global Feature Impact on Premium")
        st.write("## Global Mean SHAP Impact Table")
        st.write(
            "This table shows the average impact of each sublimit on the premium, scaled for a specified increase. "
            "A negative impact (displayed in green) means that increasing the sublimit reduces the premium, "
            "while a positive impact (displayed in red) means it increases the premium."
        )
        df_mean_shap = compute_mean_shap_values(model, quotes_proc)
        top_n = st.slider("Number of top sublimits to display", 10, 75, 10)
        df_top = combine_small_features(df_mean_shap, top_n=top_n)
        step = st.number_input(
            "Sublimit Increase Step ($)", min_value=1, value=10000, step=1000
        )
        impact_table = create_absolute_impact_table(df_top, step)

        def color_impact(val):
            try:
                v = float(val)
            except:
                v = 0.0
            if v < 0:
                return "color: green"
            else:
                return "color: red"

        styled_table = impact_table.style.format(
            {f"Absolute Impact (per ${step:,.0f} increase)": "${:,.2f}"}
        )
        styled_table = styled_table.applymap(
            color_impact, subset=[f"Absolute Impact (per ${step:,.0f} increase)"]
        )
        st.write("### Impact Table")
        st.markdown(styled_table.to_html(), unsafe_allow_html=True)
        exec_summary = generate_exec_summary(df_top, step)
        st.write("### Executive Summary")
        for line in exec_summary:
            st.text(line)
        st.write(
            "How to read this table:\n"
            "- The 'Absolute Impact' column shows the change in premium (in dollars) for a given increase in the sublimit.\n"
            "- A negative impact (displayed in green) means that increasing the sublimit reduces the premium, while a positive impact (displayed in red) means it increases the premium."
        )
        try:
            from transformers import pipeline

            summarizer = pipeline("summarization")
            combined_summary_text = " ".join(exec_summary)
            nlp_summary = summarizer(
                combined_summary_text, max_length=100, min_length=30, do_sample=False
            )[0]["summary_text"]
            st.write("### NLP Summary of Executive Summary")
            st.text(nlp_summary)
        except Exception as e:
            st.write("NLP summarization not available.", e)

    with tabs[1]:
        st.title("Quotes vs Submission Comparison")
        # For the comparison, we use the original (unprocessed) submission and quotes data.
        # We assume that sublimit columns contain "amount"
        sublimit_cols = [
            col for col in submission_df_orig.columns if "amount" in col.lower()
        ]
        if not sublimit_cols:
            st.write("No sublimit columns found in submission data.")
        else:
            selected_sublimit = st.selectbox(
                "Select Sublimit to Compare",
                sublimit_cols,
                format_func=format_feature_name,
            )
            submission_value = submission_df_orig[selected_sublimit].iloc[0]
            quote_values = quotes_df_orig[selected_sublimit]
            comp_df = pd.DataFrame(
                {
                    "Quote": quote_values.index,
                    "Quote Value": quote_values,
                }
            )
            if carriers is not None:
                comp_df["Carrier"] = carriers.values
            comp_df["Submission Value"] = submission_value
            comp_df["Difference"] = comp_df["Quote Value"] - submission_value
            st.write(f"### Comparison for {format_feature_name(selected_sublimit)}")
            st.dataframe(comp_df)
            chart = (
                alt.Chart(comp_df)
                .mark_bar()
                .encode(
                    x=alt.X(
                        "Quote Value:Q",
                        title=f"{format_feature_name(selected_sublimit)} Value",
                    ),
                    y=alt.Y(
                        "Carrier:N" if "Carrier" in comp_df.columns else "Quote:N",
                        title="Quote",
                    ),
                    tooltip=[
                        "Quote",
                        "Carrier",
                        "Quote Value",
                        "Submission Value",
                        "Difference",
                    ],
                )
            )
            rule = (
                alt.Chart(pd.DataFrame({"x": [submission_value]}))
                .mark_rule(color="black")
                .encode(x="x:Q")
            )
            st.altair_chart(chart + rule, use_container_width=True)
            st.write(
                f"Submission value for {format_feature_name(selected_sublimit)}: ${submission_value:,.2f}"
            )


if __name__ == "__main__":
    main()
