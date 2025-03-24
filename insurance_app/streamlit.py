import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from math import log
from ortools.linear_solver import pywraplp

# ===========================
# Global Configuration & Constants
# ===========================
LAYERS = [
    {"name": "Primary $10M", "limit": 10e6},
    {"name": "$10M xs $10M", "limit": 10e6},
    {"name": "$10M xs $20M", "limit": 10e6},
]

CREDIT_RATING_MAPPING = {1: "B", 2: "A", 3: "AA"}

# Total capacity (constant, since full allocation is enforced)
C_total = sum(layer["limit"] for layer in LAYERS)

# ===========================
# Data Loading & Global Baselines
# ===========================
#@st.cache_data
def load_data():
    # New dataset with 10 quotes per layer for clear variation.
    # For "Primary $10M":
    premiums_primary = [1220000, 1250000, 1280000, 1300000, 1320000, 1340000, 1360000, 1380000, 1400000, 1370000]
    coverage_primary = [0.90, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.95, 0.94]
    # For "$10M xs $10M":
    premiums_xs10 = [1010000, 1030000, 1050000, 1070000, 1090000, 1110000, 1130000, 1150000, 1170000, 1190000]
    coverage_xs10 = [0.80, 0.81, 0.82, 0.83, 0.84, 0.85, 0.86, 0.87, 0.88, 0.86]
    # For "$10M xs $20M":
    premiums_xs20 = [910000, 930000, 950000, 970000, 990000, 1010000, 1030000, 1050000, 1070000, 1090000]
    coverage_xs20 = [0.85, 0.86, 0.87, 0.88, 0.89, 0.90, 0.91, 0.92, 0.93, 0.92]
    
    df_primary = pd.DataFrame({
        "Carrier": ["AIG", "Allianz", "AXA", "Zurich", "Chubb", "Liberty", "Berkshire", "Travelers", "Munich Re", "Swiss Re"],
        "Layer": "Primary $10M",
        "Premium": premiums_primary,
        "Capacity": [2]*10,
        "Coverage_Score": coverage_primary,
        "CreditRatingValue": [2, 2, 3, 2, 3, 2, 2, 2, 3, 3]
    })
    df_xs10 = pd.DataFrame({
        "Carrier": ["Hannover Re", "SCOR", "Partner Re", "Renaissance Re", "Arch Capital", "Axis Capital", "AIG", "Endurance", "Aspen Re", "Validus"],
        "Layer": "$10M xs $10M",
        "Premium": premiums_xs10,
        "Capacity": [2]*10,
        "Coverage_Score": coverage_xs10,
        "CreditRatingValue": [1, 2, 1, 2, 2, 3, 2, 3, 3, 1]
    })
    df_xs20 = pd.DataFrame({
        "Carrier": ["Chubb", "Catlin", "Allied World", "Hiscox", "Amlin", "Beazley", "AXA", "Brit", "MS Amlin", "XL Catlin"],
        "Layer": "$10M xs $20M",
        "Premium": premiums_xs20,
        "Capacity": [2]*10,
        "Coverage_Score": coverage_xs20,
        "CreditRatingValue": [2, 1, 2, 2, 1, 2, 3, 2, 1, 2]
    })
    df = pd.concat([df_primary, df_xs10, df_xs20], ignore_index=True)
    df["CreditRating"] = df["CreditRatingValue"].map(CREDIT_RATING_MAPPING)
    df["Capacity"] = df["Capacity"] * 1e6  # Convert to dollars
    return df

df_quotes = load_data()

def compute_global_baselines(df):
    """
    Compute global baselines (agostic to filters):
      - Global Baseline Premium (BP): Sum of the minimum premium per layer (from full dataset).
      - Global Baseline Coverage (BAC): Overall weighted average coverage (value between 0 and 1) of the full dataset.
    """
    baseline_premium = 0
    for layer in LAYERS:
        layer_name = layer["name"]
        df_layer = df[df["Layer"] == layer_name]
        if not df_layer.empty:
            baseline_premium += df_layer["Premium"].min()
    total_capacity = df["Capacity"].sum()
    if total_capacity > 0:
        baseline_coverage = (df["Coverage_Score"] * df["Capacity"]).sum() / total_capacity
    else:
        baseline_coverage = 0
    return baseline_premium, baseline_coverage

# Set global baselines if not already computed.
if "global_baseline_premium" not in st.session_state:
    bp, bc = compute_global_baselines(df_quotes)
    st.session_state.global_baseline_premium = bp
    st.session_state.global_baseline_coverage = bc

# ===========================
# Optimization Function (Full Capacity Allocation with Composite Objective)
# ===========================
def get_status_name(status, solver):
    if status == solver.OPTIMAL:
        return "OPTIMAL"
    elif status == solver.FEASIBLE:
        return "FEASIBLE"
    elif status == solver.INFEASIBLE:
        return "INFEASIBLE"
    elif status == solver.ABNORMAL:
        return "ABNORMAL"
    elif status == solver.NOT_SOLVED:
        return "NOT_SOLVED"
    else:
        return "UNKNOWN"

def run_optimization_on_data(params, df_data, enforce_thresholds=False):
    """
    Solve the optimization problem with:
      - Full capacity allocation per layer (equality constraints)
      - Hard filters: required carriers, credit rating, diversification.
    The objective is to maximize a composite score defined as:
       Score = w * (Average Coverage / Global Baseline Coverage) - (1 - w) * (Total Premium / Global Baseline Premium)
    (This is equivalent to a linear weighted sum in normalized units.)
    If enforce_thresholds is True, additional constraints (like maximum premium) would be added.
    For Pareto analysis, we set enforce_thresholds=False.
    Returns:
      result_df, status_str, total_signed_premium, average_coverage, composite_score, norm_prem, norm_cov
    """
    solver = pywraplp.Solver.CreateSolver('CBC')
    if not solver:
        st.error("Solver not available.")
        return None, "Solver Error", None, None, None, None, None
    n = len(df_data)
    x = [solver.NumVar(0, 1, f'x_{i}') for i in range(n)]
    
    # Full capacity allocation: For each layer, sum(Capacity*x) == layer limit.
    for layer in LAYERS:
        layer_name = layer["name"]
        layer_limit = layer["limit"]
        indices = df_data.index[df_data["Layer"] == layer_name].tolist()
        solver.Add(solver.Sum([df_data.loc[i, "Capacity"] * x[i] for i in indices]) == layer_limit)
    
    # If enforcing thresholds, add overall maximum premium constraint (if needed).
    if enforce_thresholds:
        solver.Add(solver.Sum([df_data.loc[i, "Premium"] * df_data.loc[i, "Capacity"] * x[i] for i in range(n)]) <= params["target_max_premium"])
        # We are not enforcing a per-layer coverage constraint here.
    
    # Required carriers constraint.
    for carrier in params.get("required_carriers", []):
        indices = df_data.index[df_data["Carrier"] == carrier].tolist()
        if indices:
            solver.Add(solver.Sum([df_data.loc[i, "Capacity"] * x[i] for i in indices]) >= 0.001 * 1e6)
    
    # Credit rating constraint.
    min_credit = params.get("min_credit", 1)
    for i in range(n):
        if df_data.loc[i, "CreditRatingValue"] < min_credit:
            solver.Add(x[i] == 0)
    
    # Diversification constraint.
    if params.get("diversify", False):
        max_cap = params.get("max_capacity_per_carrier", 10e6)
        for carrier in df_data["Carrier"].unique():
            for layer in LAYERS:
                indices = df_data.index[(df_data["Carrier"] == carrier) & (df_data["Layer"] == layer["name"])].tolist()
                if indices:
                    solver.Add(solver.Sum([df_data.loc[i, "Capacity"] * x[i] for i in indices]) <= max_cap)
    
    # Compute objective coefficients.
    # Global baselines (constant) from session_state:
    BP = st.session_state.global_baseline_premium
    BAC = st.session_state.global_baseline_coverage
    # Since full allocation is enforced, total allocated capacity = C_total.
    A = 1 / (C_total * BAC)   # For coverage term.
    B = 1 / BP                # For premium term.
    w = params.get("premium_weight", 0.5)
    # Our objective is:
    # Maximize Score = w * A * (sum_i Coverage_i * Capacity_i * x_i) - (1 - w) * B * (sum_i Premium_i * Capacity_i * x_i)
    coverage_expr = solver.Sum([df_data.loc[i, "Coverage_Score"] * df_data.loc[i, "Capacity"] * x[i] for i in range(n)])
    premium_expr = solver.Sum([df_data.loc[i, "Premium"] * df_data.loc[i, "Capacity"] * x[i] for i in range(n)])
    solver.Maximize(w * A * coverage_expr - (1 - w) * B * premium_expr)
    
    status = solver.Solve()
    if status != solver.OPTIMAL:
        return None, get_status_name(status, solver), None, None, None, None, None
    
    results = []
    for i in range(n):
        fraction = x[i].solution_value() if x[i].solution_value() is not None else 0
        if fraction < 1e-6:
            fraction = 0
        row = df_data.loc[i].copy()
        row["FractionAllocated"] = fraction
        row["SignedCapacity"] = row["Capacity"] * fraction
        row["SignedPremium"] = row["Premium"] * fraction
        layer_limit = next(item["limit"] for item in LAYERS if item["name"] == row["Layer"])
        row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limit) * 100
        results.append(row)
    result_df = pd.DataFrame(results)
    
    total_signed_premium = result_df["SignedPremium"].sum()
    # Since full capacity is allocated, total allocated capacity = C_total (a constant)
    total_allocated = C_total
    weighted_cov = (result_df["Coverage_Score"] * result_df["SignedCapacity"]).sum()
    average_coverage = weighted_cov / total_allocated if total_allocated > 0 else 0
    
    norm_prem = total_signed_premium / BP
    norm_cov = average_coverage / BAC if BAC > 0 else 0
    # Composite Score (linear weighted sum in normalized units)
    composite_score = w * norm_cov - (1 - w) * norm_prem
    
    return result_df, "OPTIMAL", total_signed_premium, average_coverage, composite_score, norm_prem, norm_cov

# ===========================
# Streamlit App UI (Stepwise)
# ===========================
#st.set_page_config(page_title="Insurance Placement Optimizer", layout="wide")
st.title("Insurance Placement Optimizer")
st.markdown("Follow the steps below to generate your optimized placement structure:")

# --- Step 1: Dynamic Baseline Filters ---
with st.expander("Step 1: Dynamic Baseline Filters", expanded=True):
    st.markdown("**Set your hard filters:**")
    selected_carriers = st.multiselect("Selected Carriers", options=sorted(df_quotes["Carrier"].unique()))
    credit_option = st.selectbox("Minimum Credit Rating", options=[("B and above", 1), ("A and above", 2), ("AA and above", 3)],
                                 format_func=lambda x: x[0])
    min_credit_value = credit_option[1]
    diversify = st.checkbox("Diversify Carriers")
    max_capacity_input = None
    if diversify:
        max_capacity_input = st.number_input("Maximum Capacity per Carrier per Layer (in millions $)", min_value=0.5, value=2.0, step=0.1) * 1e6
    if st.button("Apply Filters"):
        # Filter the data based on credit rating and selected carriers.
        df_filtered = df_quotes[df_quotes["CreditRatingValue"] >= min_credit_value].copy()
        if selected_carriers:
            df_filtered = df_filtered[df_filtered["Carrier"].isin(selected_carriers)]
        st.session_state.df_dynamic = df_filtered.copy()
        st.session_state.min_credit = min_credit_value
        st.session_state.required_carriers = selected_carriers
        st.session_state.diversify = diversify
        if diversify:
            st.session_state.max_capacity_per_carrier = max_capacity_input
        else:
            st.session_state.max_capacity_per_carrier = None
        st.success("Filters applied. Proceed to Pareto analysis.")

# --- Step 2: Pareto Analysis ---
if "df_dynamic" in st.session_state:
    with st.expander("Step 2: Pareto Analysis", expanded=True):
        st.markdown("Generating 10 Pareto optimal solutions (ignoring overall premium/coverage thresholds)...")
        pareto_solutions = []
        weights = np.linspace(0, 1, 10)
        opt_params = {
            "target_max_premium": st.session_state.global_baseline_premium * 2,  # Not enforced in Pareto analysis
            "target_min_coverage": st.session_state.global_baseline_coverage,    # Not enforced
            "min_credit": st.session_state.min_credit,
            "required_carriers": st.session_state.required_carriers,
            "diversify": st.session_state.diversify
        }
        if st.session_state.diversify:
            opt_params["max_capacity_per_carrier"] = st.session_state.max_capacity_per_carrier
        
        for w in weights:
            opt_params["premium_weight"] = w
            # For Pareto, we ignore thresholds by setting enforce_thresholds=False.
            result = run_optimization_on_data(opt_params, st.session_state.df_dynamic, enforce_thresholds=False)
            if result[0] is None:
                continue
            res_df, status_str, total_sp, avg_cov, comp_score, norm_prem, norm_cov = result
            pareto_solutions.append({
                "Weight": w,
                "Total Premium": total_sp,
                "Average Coverage": avg_cov,
                "Composite Score": comp_score,
                "Norm Premium": norm_prem,
                "Norm Coverage": norm_cov,
                "Data": res_df
            })
        if not pareto_solutions:
            st.error("No feasible Pareto solutions found. Consider adjusting your filters.")
        else:
            pareto_summary = pd.DataFrame([
                {"Weight": sol["Weight"],
                 "Total Premium": sol["Total Premium"],
                 "Average Coverage": sol["Average Coverage"],
                 "Composite Score": sol["Composite Score"]} for sol in pareto_solutions
            ])
            st.markdown("**Composite Score vs. Weight**")
            fig_line = px.line(pareto_summary, x="Weight", y="Composite Score", markers=True,
                               title="Composite Score vs. Weight (0 = Coverage Priority, 1 = Premium Priority)")
            fig_line.add_scatter(x=pareto_summary["Weight"], y=pareto_summary["Total Premium"],
                                 mode="markers+lines", name="Total Premium")
            fig_line.add_scatter(x=pareto_summary["Weight"], y=pareto_summary["Average Coverage"],
                                 mode="markers+lines", name="Average Coverage")
            equal_point = pareto_summary[pareto_summary["Weight"] == 0.5]
            if not equal_point.empty:
                fig_line.add_scatter(x=equal_point["Weight"], y=equal_point["Composite Score"],
                                     mode="markers", marker=dict(size=12, color="red"),
                                     name="Equal Weight (0.5)")
            st.plotly_chart(fig_line, use_container_width=True)
            st.dataframe(pareto_summary.round(2))
            
            selected_index = st.selectbox("Select a Pareto Solution (by index)", options=list(range(len(pareto_summary))),
                                            format_func=lambda i: f"Solution {i+1} - Weight: {pareto_summary.iloc[i]['Weight']:.2f}")
            selected_solution = pareto_solutions[selected_index]
            st.markdown(f"**Selected Pareto Solution:** Weight: {selected_solution['Weight']:.2f}, "
                        f"Total Premium: ${selected_solution['Total Premium']:,.0f}, "
                        f"Average Coverage: {selected_solution['Average Coverage']:.2f}, "
                        f"Composite Score: {selected_solution['Composite Score']:.2f}")
            
            if st.button("Generate Mudmap for Selected Solution"):
                final_df = selected_solution["Data"]
                total_signed_premium = final_df["SignedPremium"].sum()
                # Total allocated capacity is constant: C_total.
                weighted_cov = (final_df["Coverage_Score"] * final_df["SignedCapacity"]).sum()
                average_coverage = weighted_cov / C_total if C_total > 0 else 0
                norm_prem = selected_solution["Norm Premium"]
                norm_cov = selected_solution["Norm Coverage"]
                composite_score = selected_solution["Composite Score"]
                
                st.subheader("Final Optimized Placement")
                col1, col2 = st.columns(2)
                col1.metric("Total Signed Premium", f"${total_signed_premium:,.0f}")
                col2.metric("Average Coverage", f"{average_coverage:.2f}")
                
                st.markdown(f"**Summary:** The selected Pareto solution yields a total signed premium of ${total_signed_premium:,.0f} and an average coverage of {average_coverage:.2f}.")
                st.markdown(f"**Composite Score Breakdown:**<br>"
                            f"- Normalized Premium: {norm_prem:.2f}<br>"
                            f"- Normalized Coverage: {norm_cov:.2f}<br>"
                            f"- Composite Score: {composite_score:.2f}",
                            unsafe_allow_html=True)
                
                if st.session_state.required_carriers:
                    display_df = final_df[final_df["Carrier"].isin(st.session_state.required_carriers)]
                else:
                    display_df = final_df.copy()
                st.subheader("Optimized Placement Details")
                st.dataframe(display_df[["Carrier", "Layer", "SignedCapacity", "SignedPremium", "AllocationPercentage", "FractionAllocated"]].round(2))
                
                df_plot = final_df[final_df["SignedCapacity"] > 0].copy()
                layer_order = {layer["name"]: idx for idx, layer in enumerate(LAYERS)}
                df_plot["LayerOrder"] = df_plot["Layer"].map(layer_order)
                df_plot.sort_values(["LayerOrder", "Carrier"], inplace=True)
                fig_mudmap = px.bar(
                    df_plot,
                    x="AllocationPercentage",
                    y="Layer",
                    color="Carrier",
                    orientation="h",
                    text=df_plot["AllocationPercentage"].apply(lambda x: f"{x:.2f}%"),
                    title="Optimized Allocation (Mudmap)"
                )
                fig_mudmap.update_layout(barmode="stack", xaxis_title="Allocation Percentage", yaxis_title="Layer")
                st.plotly_chart(fig_mudmap, use_container_width=True)
                st.markdown("**Note:** The composite score is computed as:  \n"
                            "Composite Score = weight * (Average Coverage / Global Baseline Coverage) - (1 - weight) * (Total Premium / Global Baseline Premium)  \n"
                            "A weight of 0.5 represents equal priority for maximizing coverage and minimizing premium.",
                            unsafe_allow_html=True)
