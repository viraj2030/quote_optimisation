from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import numpy as np
import pulp
import pandas as pd
import os
import json
import traceback
from optimizer import (
    run_optimization_continuous,
    run_optimization_max_coverage_with_premium_constraint,
    get_quote_data,
    run_optimization_hierarchical,
)

app = Flask(__name__)
# Enable CORS for all routes with specific origins
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "https://tourmaline-meringue-0ec52a.netlify.app",
                "https://*.netlify.app",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

# Ensure Homebrew's bin is in the PATH so solvers can be found on macOS
os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ.get("PATH", "")


@app.route("/")
def root():
    return redirect("http://localhost:3000")


@app.route("/api/healthcheck")
def healthcheck():
    """Health check endpoint to verify the API is running"""
    return jsonify({"status": "ok", "message": "API is running"})


@app.route("/api/quotes", methods=["GET"])
def get_quotes():
    """Return all available quotes"""
    df_quotes = get_quote_data()
    return jsonify(json.loads(df_quotes.to_json(orient="records")))


@app.route("/api/optimize", methods=["POST"])
def optimize():
    try:
        data = request.json
        print(f"Received optimization parameters: {data}")

        # Extract optimization parameters
        premium_weight = data.get("premium_weight", 3)
        coverage_weight = data.get("coverage_weight", 3)
        credit_threshold = data.get("credit_threshold", 1)

        # Process required carriers
        required_carriers_raw = data.get("required_carriers", [])
        # Filter out empty strings or None values
        required_carriers = [carrier for carrier in required_carriers_raw if carrier]
        print(f"Required carriers after processing: {required_carriers}")

        # Extract diversification parameters
        diversify = data.get("diversify", False)
        max_capacity_abs = data.get("max_capacity_abs", None)
        min_capacity_abs = data.get("min_capacity_abs", None)

        # Extract hierarchical optimization flag and diversification factor
        use_hierarchical = data.get("use_hierarchical", False)
        diversification_factor = data.get("diversification_factor", 0.5)

        # Choose the optimization approach
        if use_hierarchical:
            # Use the hierarchical approach
            df_result, status = run_optimization_hierarchical(
                premium_weight,
                coverage_weight,
                required_carriers,
                credit_threshold,
                diversify,
                max_capacity_abs,
                min_capacity_abs,
                diversification_factor,
            )
        else:
            # Use the standard approach
            df_result, status = run_optimization_continuous(
                premium_weight,
                coverage_weight,
                required_carriers,
                credit_threshold,
                diversify,
                max_capacity_abs,
                min_capacity_abs,
            )

        # Check if optimization was successful
        if df_result is None:
            # Extract warnings from the status message if any
            if "Note:" in status:
                main_status = status.split("Note:")[0].strip()
                notes = status.split("Note:")[1].strip()
                return jsonify(
                    {"error": main_status, "notes": notes, "status": status}
                ), 400
            else:
                return jsonify({"error": status, "status": status}), 400

        # Process the results for the frontend
        result_data = df_result.to_dict(orient="records")

        # Add summary statistics by layer
        layer_stats = []
        for layer in ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]:
            layer_data = df_result[df_result["Layer"] == layer]
            active_carriers = layer_data[layer_data["SignedCapacity"] > 0].shape[0]
            total_premium = layer_data["SignedPremium"].sum()
            avg_coverage = (
                (layer_data["Coverage_Score"] * layer_data["SignedCapacity"]).sum()
                / 10.0
                if active_carriers > 0
                else 0
            )

            layer_stats.append(
                {
                    "layer": layer,
                    "active_carriers": active_carriers,
                    "total_premium": float(total_premium),
                    "avg_coverage_score": float(avg_coverage),
                }
            )

        # Format as expected by the frontend
        return jsonify(
            {
                "status": status,
                "solution": result_data,
                "summary": {
                    "total_premium": float(df_result["SignedPremium"].sum()),
                    "avg_coverage_score": float(
                        (
                            df_result["Coverage_Score"] * df_result["SignedCapacity"]
                        ).sum()
                        / 30.0
                    ),
                    "layer_stats": layer_stats,
                },
            }
        )

    except Exception as e:
        print(f"Error in optimization: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e), "status": "Error"}), 500


@app.route("/api/generate-options", methods=["POST"])
def generate_options():
    """Generate multiple placement options"""
    params = request.json

    print(f"Received generate-options parameters: {params}")

    # Extract and ensure required_carriers is a list of strings
    required_carriers = params.get("required_carriers", [])
    if required_carriers and not isinstance(required_carriers, list):
        required_carriers = [required_carriers]

    print(f"Required carriers for options generation: {required_carriers}")
    print(
        f"All parameters after processing: premium_weight={params.get('premium_weight')}, "
        f"coverage_weight={params.get('coverage_weight')}, "
        f"credit_threshold={params.get('credit_threshold')}, "
        f"diversify={params.get('diversify')}, "
        f"max_capacity_abs={params.get('max_capacity_abs')}, "
        f"min_capacity_abs={params.get('min_capacity_abs')}"
    )

    df_quotes = get_quote_data()

    try:
        # Get extreme solutions first
        df_min, status_min = run_optimization_continuous(
            w_premium=1,
            w_coverage=0,
            required_carriers=required_carriers,
            min_credit=params.get("credit_threshold", 2),
            diversify=params.get("diversify", False),
            max_capacity_abs=params.get("max_capacity_abs", 2.0),
            min_capacity_abs=params.get("min_capacity_abs", 0.0),
        )

        if df_min is None:
            return jsonify(
                {"error": f"Failed to find minimum premium solution: {status_min}"}
            ), 400

        min_prem_value = df_min["SignedPremium"].sum()

        df_maxcov, status_maxcov = run_optimization_continuous(
            w_premium=0,
            w_coverage=1,
            required_carriers=required_carriers,
            min_credit=params.get("credit_threshold", 2),
            diversify=params.get("diversify", False),
            max_capacity_abs=params.get("max_capacity_abs", 2.0),
            min_capacity_abs=params.get("min_capacity_abs", 0.0),
        )

        if df_maxcov is None:
            return jsonify(
                {"error": f"Failed to find maximum coverage solution: {status_maxcov}"}
            ), 400

        premium_for_maxcov = df_maxcov["SignedPremium"].sum()

        # Generate solutions with different premium thresholds
        num_candidates = params.get("num_candidates", 100)
        candidate_premiums = np.linspace(
            min_prem_value, premium_for_maxcov, num_candidates
        )

        solutions = []
        for i, candidate in enumerate(candidate_premiums):
            sol_df, metrics, status = (
                run_optimization_max_coverage_with_premium_constraint(
                    premium_threshold=candidate,
                    required_carriers=required_carriers,
                    min_credit=params.get("credit_threshold", 2),
                    diversify=params.get("diversify", False),
                    max_capacity_abs=params.get("max_capacity_abs", 2.0),
                    min_capacity_abs=params.get("min_capacity_abs", 0.0),
                )
            )

            if metrics is not None:
                metrics["option_id"] = i
                metrics["solution"] = json.loads(sol_df.to_json(orient="records"))
                solutions.append(metrics)

        return jsonify(
            {
                "min_premium": min_prem_value,
                "max_premium": premium_for_maxcov,
                "options": solutions,
            }
        )
    except Exception as e:
        # Log and return any unexpected errors
        print(f"Error generating options: {str(e)}")
        return jsonify({"error": str(e), "status": "Error"}), 500


@app.route("/api/coverage-analysis/features", methods=["GET"])
def coverage_analysis_features():
    """Return pre-computed SHAP values for the feature impact analysis"""
    try:
        # Get the sublimit step amount from query parameters or use default
        step = request.args.get("step", default=10000, type=int)

        # Import helper functions from the coverage analysis module
        from coverage_analysis import (
            get_feature_impact,
            generate_exec_summary,
            get_feature_impact_detailed,
        )

        # Get feature impact data
        feature_impact = get_feature_impact(step)

        # Generate executive summary directly using the feature_impact list
        summary = generate_exec_summary(feature_impact, step)

        # Get detailed feature impact for new visualization
        detailed_impact = get_feature_impact_detailed(step)

        return jsonify(
            {
                "feature_impact": feature_impact,
                "executive_summary": summary,
                "detailed_impact": detailed_impact,
            }
        )
    except Exception as e:
        print(f"Error in coverage analysis features: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/coverage-analysis/quotes-comparison", methods=["GET"])
def get_quotes_comparison():
    """Return comparison data for quotes vs submission"""
    try:
        sublimit = request.args.get("sublimit")
        if not sublimit:
            return jsonify({"error": "Sublimit parameter is required"}), 400

        df_quotes = get_quote_data()
        if sublimit not in df_quotes.columns:
            return jsonify({"error": f"Invalid sublimit: {sublimit}"}), 400

        # Get the submission value (assuming it's in the first row)
        submission_value = float(df_quotes[sublimit].iloc[0])

        # Prepare comparison data
        comparison_data = []
        for idx, row in df_quotes.iterrows():
            comparison_data.append(
                {
                    "quote": idx,
                    "carrier": row.get("carrier", f"Quote {idx + 1}"),
                    "quoteValue": float(row[sublimit]),
                    "submissionValue": submission_value,
                }
            )

        return jsonify(
            {
                "formattedName": sublimit.replace("_", " ").title(),
                "sublimit": sublimit,
                "submission": submission_value,
                "comparison": comparison_data,
            }
        )
    except Exception as e:
        print(f"Error generating comparison: {str(e)}")
        return jsonify({"error": "Failed to generate comparison"}), 500


@app.route("/api/coverage-analysis/sublimits", methods=["GET"])
def get_coverage_analysis_sublimits():
    """Return available sublimits for coverage analysis"""
    try:
        df_quotes = get_quote_data()
        sublimits = df_quotes.columns[
            df_quotes.columns.str.contains("sublimit", case=False)
        ].tolist()
        return jsonify({"sublimits": sublimits})
    except Exception as e:
        print(f"Error fetching sublimits: {str(e)}")
        return jsonify({"error": "Failed to fetch sublimits"}), 500


@app.route("/api/sublimits/<quote_id>", methods=["GET"])
def get_sublimits_by_quote_id(quote_id):
    """Return sublimits for a specific quote ID with submission values for comparison"""
    try:
        # Get quotes data from the optimizer.py file
        df_quotes = get_quote_data()

        # Find the quote with the matching QuoteID (assign QuoteIDs if not present)
        df_quotes["QuoteID"] = [f"Quote {i + 1}" for i in range(len(df_quotes))]
        matched_quotes = df_quotes[df_quotes["QuoteID"] == quote_id]

        if len(matched_quotes) == 0:
            return jsonify({"error": f"Quote with ID '{quote_id}' not found"}), 404

        quote = matched_quotes.iloc[0].to_dict()

        # Extract carrier and layer info for matching with Excel data
        carrier_name = quote.get("Carrier")
        layer_info = quote.get("Layer")

        # Load the Excel file with sublimits data
        import pandas as pd
        import os
        from coverage_analysis import load_data  # Import submission data

        # Load quote data from Excel
        df = pd.read_excel("data/adjusted_ml_ready_quotes.xlsx")

        # Load submission data for comparison
        submission_df = pd.read_csv("data/Submission_ML-Ready_Format.csv")

        # Initialize an empty list for sublimits
        sublimits = []

        # Function to match carrier and layer in the Excel data
        def match_carrier_and_layer(row_carrier, row_data):
            # Simple exact carrier name matching (case insensitive)
            carrier_match = (
                carrier_name.lower() in row_carrier.lower()
                or row_carrier.lower() in carrier_name.lower()
            )

            # For layer matching, check if the layer info is contained in the carrier string
            # This is a simple approach - may need to be refined based on actual data format
            layer_match = True  # Default to True if layer_info is not provided
            if layer_info:
                layer_match = layer_info.lower() in row_carrier.lower()

            return carrier_match and layer_match

        # Find matching rows in the Excel data
        matching_rows = []
        for idx, row in df.iterrows():
            if match_carrier_and_layer(row["carrier"], row):
                matching_rows.append(row)

        if not matching_rows:
            return jsonify({"error": "No matching sublimits found for this quote"}), 404

        # Get the first matching row
        row = matching_rows[0]

        # Extract all columns that contain sublimit information (ending with _amount)
        sublimit_columns = [col for col in df.columns if col.endswith("_amount")]

        # Get all submission sublimit columns
        submission_sublimit_columns = [
            col for col in submission_df.columns if col.endswith("_amount")
        ]

        # Process all submission sublimits
        for col in submission_sublimit_columns:
            # Get the base name without _amount
            base_name = col[:-7]  # Remove _amount

            # Get submission value
            submission_value = None
            if col in submission_df.columns:
                submission_value = (
                    float(submission_df[col].iloc[0])
                    if not pd.isna(submission_df[col].iloc[0])
                    else None
                )

            # Skip if submission value is None or 0
            if submission_value is None or submission_value == 0:
                continue

            # Check if corresponding coverage and basis columns exist
            coverage_col = f"{base_name}_coverage"
            basis_col = f"{base_name}_aggregatebasis"

            # Get quote value if it exists
            amount = None
            if col in row.index:  # Check if the column exists in the quote
                amount = row[col] if not pd.isna(row[col]) else None

            # Get coverage and basis if they exist
            coverage = (
                row[coverage_col]
                if coverage_col in row.index and not pd.isna(row[coverage_col])
                else None
            )
            basis = (
                row[basis_col]
                if basis_col in row.index and not pd.isna(row[basis_col])
                else None
            )

            # Calculate difference and percentage difference
            difference = None
            percentage_difference = None
            if amount is not None and submission_value is not None:
                difference = float(amount) - submission_value
                percentage_difference = (
                    (difference / submission_value) * 100 if submission_value else None
                )

            # Add to sublimits list
            sublimits.append(
                {
                    "name": base_name.replace("_", " ").title(),
                    "amount": float(amount) if amount is not None else None,
                    "coverage": str(coverage) if coverage is not None else None,
                    "basis": str(basis) if basis is not None else None,
                    "submission_value": submission_value,
                    "difference": difference,
                    "percentage_difference": percentage_difference,
                }
            )

        # Sort sublimits by absolute difference if available
        if sublimits:
            # First, filter out entries with None difference
            sorted_sublimits = [s for s in sublimits if s["difference"] is not None]
            # Sort by absolute difference
            sorted_sublimits.sort(key=lambda x: abs(x["difference"]), reverse=True)
            # Append entries with None difference
            sorted_sublimits.extend([s for s in sublimits if s["difference"] is None])
            sublimits = sorted_sublimits

        return jsonify(
            {
                "quote": {
                    "id": quote_id,
                    "carrier": carrier_name,
                    "layer": layer_info,
                    "premium": quote.get("Premium", 0),
                    "capacity": float(quote.get("Capacity", 0)),
                    "credit_rating": quote.get("CreditRating", "N/A"),
                },
                "sublimits": sublimits,
            }
        )
    except Exception as e:
        print(f"Error in getting sublimits by quote ID: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/quotes", methods=["GET"])
def get_all_quotes():
    """Return all quotes data for the frontend to use"""
    try:
        # Use the quote data from the optimizer.py file
        df_quotes = get_quote_data()
        quotes_list = df_quotes.to_dict("records")

        # Convert each quote to have the same format with consistent IDs
        for i, quote in enumerate(quotes_list):
            quote["QuoteID"] = f"Quote {i + 1}"

        return jsonify({"quotes": quotes_list})

    except Exception as e:
        print(f"Error in getting all quotes: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/coverage-scores", methods=["POST"])
def calculate_coverage_scores():
    try:
        # Load request data
        data = request.json
        weights = data.get("weights", {})

        # Load the submission data from the correct file
        submission_df = pd.read_csv("data/Submission_ML-Ready_Format.csv")
        submission = submission_df.iloc[0]  # Get the first row as submission

        # Load the quotes data
        quotes_df = pd.read_excel("data/adjusted_ml_ready_quotes.xlsx")

        # Get all columns ending with _amount (these are our sublimits)
        sublimit_columns = [col for col in quotes_df.columns if col.endswith("_amount")]

        print(f"\nProcessing {len(sublimit_columns)} sublimit columns")
        print(f"Available weights: {weights}")
        print(f"Submission columns: {list(submission_df.columns)}")

        # Create mapping between quote columns and submission columns
        column_mapping = {}
        for sublimit in sublimit_columns:
            # Try exact match first
            if sublimit in submission_df.columns:
                column_mapping[sublimit] = sublimit
            else:
                # Try case-insensitive match with spaces/underscores normalized
                sublimit_normalized = sublimit.lower().replace("_", " ")
                for submission_col in submission_df.columns:
                    submission_col_normalized = submission_col.lower().replace("_", " ")
                    if sublimit_normalized == submission_col_normalized:
                        column_mapping[sublimit] = submission_col
                        break

        print(f"\nColumn mapping: {column_mapping}")

        # Calculate total weight (for normalization)
        total_weight = sum(
            float(weights.get(sublimit, 0)) for sublimit in sublimit_columns
        )
        if total_weight == 0:
            return jsonify(
                {"error": "Total weight is zero. Please check weights."}
            ), 400

        # Calculate scores for each quote
        scores = []
        for idx, quote in quotes_df.iterrows():
            # Calculate weighted coverage score for each sublimit
            weighted_coverage_scores = []

            for sublimit in sublimit_columns:
                if sublimit in weights and sublimit in column_mapping:
                    submission_col = column_mapping[sublimit]
                    if not pd.isna(quote[sublimit]) and not pd.isna(
                        submission[submission_col]
                    ):
                        weight = float(weights.get(sublimit, 0))
                        quote_value = float(quote[sublimit])
                        submission_value = float(submission[submission_col])

                        if submission_value > 0:  # Avoid division by zero
                            # Calculate percentage match for this sublimit (capped at 100%)
                            sublimit_match = min(1.0, quote_value / submission_value)
                            weighted_score = sublimit_match * weight
                            weighted_coverage_scores.append(weighted_score)

                            print(
                                f"Quote {idx} - {sublimit}: quote={quote_value}, submission={submission_value}, match={sublimit_match * 100:.1f}%, weight={weight}, weighted_score={weighted_score}"
                            )

            # Calculate final coverage score (no need to multiply by 100 since weighted scores are already percentages)
            if weighted_coverage_scores:
                coverage_score = sum(weighted_coverage_scores) / total_weight
            else:
                coverage_score = 0

            try:
                premium_value = (
                    float(quote["premium"]) if not pd.isna(quote["premium"]) else 0
                )

                # Add 0.15 to the coverage score (15 percentage points)
                adjusted_coverage_score = min(
                    100, coverage_score * 100 + 15
                )  # Add 15% but cap at 100%

                scores.append(
                    {
                        "carrier": str(quote["carrier"]),
                        "layer": "Primary Layer",
                        "premium": premium_value,
                        "coverage_score": adjusted_coverage_score,  # Use adjusted score
                        "value_rating": adjusted_coverage_score
                        / (premium_value / 1000000)
                        if premium_value > 0
                        else 0,
                    }
                )
            except Exception as inner_e:
                print(f"Error processing quote #{idx}: {str(inner_e)}")
                continue

        # Sort by coverage score (highest first)
        scores.sort(key=lambda x: x["coverage_score"], reverse=True)

        return jsonify(
            {
                "scores": scores,
                "sublimit_count": len(sublimit_columns),
            }
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e), "details": traceback.format_exc()}), 500


@app.route("/api/coverage-sublimits", methods=["GET"])
def get_coverage_sublimits():
    try:
        # Load the Excel file with quotes data
        quotes_df = pd.read_excel("data/adjusted_ml_ready_quotes.xlsx")

        # Get all columns ending with _amount
        sublimit_columns = [col for col in quotes_df.columns if col.endswith("_amount")]

        # Format them for frontend display (remove _amount and replace underscores with spaces)
        formatted_sublimits = []
        for col in sublimit_columns:
            display_name = col
            if col.endswith("_amount"):
                display_name = col[:-7]  # Remove _amount suffix
            display_name = display_name.replace("_", " ")

            formatted_sublimits.append(
                {
                    "id": col,
                    "name": display_name,
                    "default_weight": 0.01,  # Default small weight
                }
            )

        # Set higher weights for important sublimits
        important_sublimits = {
            "earthquake outside of high hazard, new madrid, pacific northwest and international high hazard earthquake zones_amount": 0.20,
            "expediting expenses_amount": 0.15,
            "electronic data and media_amount": 0.12,
            "business interruption_amount": 0.10,
            "flood coverage_amount": 0.08,
            "brands and labels_amount": 0.07,
        }

        for sublimit in formatted_sublimits:
            if sublimit["id"] in important_sublimits:
                sublimit["default_weight"] = important_sublimits[sublimit["id"]]

        return jsonify(
            {"sublimits": formatted_sublimits, "count": len(formatted_sublimits)}
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e), "details": traceback.format_exc()}), 500


@app.route("/api/feature-impact", methods=["GET"])
def feature_impact():
    """Return feature impact data for the premium analysis"""
    try:
        # Import helper functions from the coverage analysis module
        from coverage_analysis import get_feature_impact_for_premium

        # Get feature impact data with real values
        impact_data = get_feature_impact_for_premium()

        return jsonify(impact_data)
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
