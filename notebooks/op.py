import streamlit as st
import pandas as pd
import numpy as np
import pulp
import plotly.express as px
import os
import math

# -----------------------------------------------------------------------------
# Session State Initialization
# -----------------------------------------------------------------------------
if "user_params" not in st.session_state or st.session_state["user_params"] is None:
    st.session_state["user_params"] = {
        "premium_weight": 5,
        "coverage_weight": 5,
        "credit_threshold": 2,         # Default: "A and above"
        "required_carriers": [],
        "diversify": False,
        "max_capacity_abs": 2.0,
        "min_capacity_abs": 0.0,
    }

# -----------------------------------------------------------------------------
# Ensure Homebrew's bin is in the PATH so solvers (e.g. glpsol) can be found on macOS
# -----------------------------------------------------------------------------
os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ.get("PATH", "")

# -----------------------------------------------------------------------------
# Page Config
# -----------------------------------------------------------------------------
st.set_page_config(page_title="Insurance Placement Optimiser", layout="wide")

# -----------------------------------------------------------------------------
# Custom CSS
# -----------------------------------------------------------------------------
st.markdown(
    """
    <style>
    body {
        background-color: white;
    }
    .reportview-container .main .block-container{
        padding-top: 1rem;
        padding-bottom: 2rem;
    }
    h1 {
        font-size: 2.2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }
    .stMetric {
        font-size: 1.5rem;
    }
    .step-header {
        font-size: 1.75rem;
        font-weight: 600;
        margin-top: 1rem;
    }
    .section-header {
        font-size: 1.4rem;
        font-weight: 600;
        margin-top: 1rem;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# Title & Introduction
# -----------------------------------------------------------------------------
st.title("Placement Structure Optimiser")
st.write("""
The optimiser helps clients find the optimum balance between price, coverage, and security.
""")

# -----------------------------------------------------------------------------
# Synthetic Quote Data
# -----------------------------------------------------------------------------
layer_limits = [10, 10, 10]

data = {
    "Carrier": [
        "AIG", "Allianz", "AXA", "Zurich", "Chubb", "Liberty", "Berkshire Hathaway Inc.", "Travelers", "Munich Re", "Swiss Re",
        "Hannover Re", "SCOR", "Partner Re", "Renaissance Re", "Arch Capital", "Axis Capital", "AIG", "Endurance", "Aspen Re", "Validus",
        "Chubb", "Catlin", "Allied World", "Hiscox", "Amlin", "Beazley", "AXA", "Brit", "MS Amlin", "XL Catlin"
    ],
    "Layer": [
        "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M",
        "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M",
        "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M"
    ],
    "Premium": [156690, 127020, 133680, 139980, 135870, 118710, 164370, 142350, 135900, 127620,
                27540, 26310, 25680, 33690, 24330, 27570, 28650, 21690, 20190, 19110, 
                19050, 20040, 20940, 21510, 17370, 19920, 18180, 23820, 19920, 23250]
,
    "Capacity": [
        2.66, 4.20, 3.11, 5.56, 3.98, 2.66, 1.98, 2.04, 2.56, 2.78,
        2.92, 5.01, 2.63, 2.56, 3.04, 2.44, 3.03, 3.55, 3.33, 3.67,
        4.01, 3.22, 2.98, 2.66, 2.44, 3.03, 2.88, 3.67, 4.94, 7
    ],
    "Coverage_Score": [
        0.97, 0.63, 0.80, 0.81, 0.83, 0.72, 0.92, 0.81, 0.76, 0.77,
        0.78, 0.73, 0.75, 0.97, 0.76, 0.89, 0.81, 0.72, 0.68, 0.66,
        0.91, 0.73, 0.77, 0.80, 0.77, 0.87, 0.86, 0.81, 0.77, 0.82
    ],
    "Preferred": [
        0, 0, 0, 0, 0, 0, 1, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        0, 0, 0, 0, 0, 0, 1, 0, 0, 0
    ],
    "CreditRating": [
        "A+", "AA", "AA-", "AA", "AA", "A", "AA", "AA", "AA", "AAA",
        "A+", "A-", "A-", "A-", "A", "A", "A+", "A-", "A-", "B+",
        "AA", "A-", "A-", "A-", "A-", "A-", "AA-", "A-", "A-", "A-"
    ],
    "CreditRatingValue": [
        4, 6, 5, 6, 6, 3, 6, 6, 6, 8,
        4, 2, 2, 2, 3, 3, 4, 2, 2, 1,
        6, 2, 2, 2, 2, 2, 5, 2, 2, 2
    ]
}
df_quotes = pd.DataFrame(data)

# -----------------------------------------------------------------------------
# Update Credit Ratings
# -----------------------------------------------------------------------------
highest_ratings = df_quotes.groupby("Carrier")["CreditRatingValue"].max().to_dict()
rev_credit_mapping = {1: "B+", 2: "A-", 3: "A",  4: "A+",  5: "AA-",  6: "AA", 7: "AA+", 8: "AAA"}

def update_rating(row):
    carrier = row["Carrier"]
    highest = highest_ratings[carrier]
    row["CreditRatingValue"] = highest
    row["CreditRating"] = rev_credit_mapping[highest]
    return row

df_quotes = df_quotes.apply(update_rating, axis=1)

# -----------------------------------------------------------------------------
# Function Definitions
# -----------------------------------------------------------------------------
def plot_mudmap(df_solution):
    df_plot = df_solution.copy()
    if "AllocationPercentage" not in df_plot.columns:
        df_plot["AllocationPercentage"] = 0
    df_plot["AllocationPercentage"] = df_plot["AllocationPercentage"].clip(lower=0)
    # Filter out rows with zero allocation so that only carriers with a share are plotted
    df_plot = df_plot[df_plot["AllocationPercentage"] > 0]
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    df_plot["LayerOrder"] = df_plot["Layer"].apply(lambda x: layer_order.get(x, 99))
    df_plot = df_plot.sort_values(["LayerOrder", "Carrier"])
    fig = px.bar(
        df_plot,
        x="AllocationPercentage",
        y="Layer",
        color="Carrier",
        orientation="h",
        text=df_plot["AllocationPercentage"].apply(lambda x: f"{x:.1f}%"),
        title="Quote Structure"
    )
    fig.update_layout(
        barmode="stack",
        xaxis_title="Capacity Allocated (% of 100)",
        yaxis_title="Layer"
    )
    return fig

def plot_security_mudmap(df_solution):
    df_plot = df_solution.copy()
    # Only keep rows with a positive SignedCapacity.
    df_plot = df_plot[df_plot["SignedCapacity"] > 0]
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    df_plot["LayerOrder"] = df_plot["Layer"].apply(lambda x: layer_order.get(x, 99))
    
    # Aggregate by Layer and CreditRating, summing SignedCapacity.
    agg_df = df_plot.groupby(["Layer", "CreditRating"], as_index=False)["SignedCapacity"].sum()
    agg_df["LayerOrder"] = agg_df["Layer"].apply(lambda x: layer_order.get(x, 99))
    agg_df = agg_df.sort_values(["LayerOrder"])
    
    # Instead of converting to an integer dollar value, keep the SignedCapacity in millions.
    # This value represents millions of dollars.
    agg_df["TotalSignedCapacity"] = agg_df["SignedCapacity"]
    
    rating_colors = {
        "B+": "#ffdc1a", 
        "A-": "#cdd30d", 
        "A": "#c9f30e", 
        "A+": "#9ad717", 
        "AA-": "#84b816", 
        "AA": "#73b816", 
        "AA+": "#639f12", 
        "AAA": "#53860e"
    }
    
    # Create the bar chart using the consolidated total signed capacity.
    fig_sec = px.bar(
        agg_df,
        x="TotalSignedCapacity",
        y="Layer",
        color="CreditRating",
        orientation="h",
        title="Security View: Total Signed Capacity by Rating and Layer",
        category_orders={"CreditRating": ["B+", "A-", "A", "A+", "AA-", "AA", "AA+", "AAA"]},
        color_discrete_map=rating_colors,
        text=agg_df["TotalSignedCapacity"].apply(lambda x: f"${x:.1f}M")
    )
    fig_sec.update_layout(
        barmode="stack",
        xaxis_title="Total Signed Capacity",
        yaxis_title="Layer",
        legend_title="Credit Rating"
    )
    fig_sec.update_yaxes(categoryorder="array", categoryarray=["Primary $10M", "$10M xs $10M", "$10M xs $20M"])
    fig_sec.update_traces(marker_line_width=0.5, marker_line_color="white")
    return fig_sec


def run_optimization_continuous(
    w_premium, w_coverage, required_carriers, min_credit,
    diversify, max_capacity_abs, min_capacity_abs=None
):
    """
    Minimizes w_premium*(Premium/scale) - w_coverage*(Coverage_Score*Capacity).
    Normalizes per-layer to compute AllocationPercentage.
    """
    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    scale = 1e5

    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = (w_premium * (row["Premium"] / scale) - w_coverage * (row["Coverage_Score"] * row["Capacity"]))
        objective_terms.append(term * x_vars[i])
    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"

    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            == layer_limits[idx]
        ), f"Layer_{layer}_Capacity"

    for carrier in required_carriers:
        indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            >= 0.001
        ), f"Required_{carrier}"

    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"

    if diversify and (max_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                prob += (
                    pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                    <= max_capacity_abs
                ), f"MaxCap_{carrier}_{layer}"
    if diversify and (min_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                available_capacity = sum(df_quotes.loc[i, "Capacity"] for i in indices)
                if available_capacity >= min_capacity_abs:
                    prob += (
                        pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                        >= min_capacity_abs
                    ), f"MinCap_{carrier}_{layer}"

    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)

    if pulp.LpStatus[prob.status] != "Optimal":
        return None, pulp.LpStatus[prob.status]

    results = []
    for i in range(num_quotes):
        fraction = pulp.value(x_vars[i])
        if fraction is None or fraction < 1e-6:
            fraction = 0
        row = df_quotes.iloc[i].copy()
        row["FractionAllocated"] = fraction
        row["SignedCapacity"] = row["Capacity"] * fraction
        row["SignedPremium"] = row["Premium"] * fraction
        results.append(row)

    df_result = pd.DataFrame(results)
    # Compute per-layer allocation percentages
    df_result["AllocationPercentage"] = 0
    for layer in df_result["Layer"].unique():
        layer_mask = df_result["Layer"] == layer
        total_alloc = df_result.loc[layer_mask, "SignedCapacity"].sum()
        if total_alloc > 0:
            df_result.loc[layer_mask, "AllocationPercentage"] = (df_result.loc[layer_mask, "SignedCapacity"] / total_alloc * 100)

    return df_result, pulp.LpStatus[prob.status]

def run_optimization_max_coverage_with_premium_constraint(
    premium_threshold, required_carriers, min_credit,
    diversify, max_capacity_abs, min_capacity_abs=None
):
    """
    Maximizes total coverage subject to total premium <= premium_threshold.
    Returns (solution_df, metrics_dict, status), with solution_df including per-layer
    AllocationPercentage. metrics_dict includes:
      - Achieved Premium
      - Achieved Total Coverage
      - Achieved Average Coverage
      - BangForYourBuck = (Achieved Total Coverage)/(Achieved Premium)
      - PremiumThreshold used
    """
    prob = pulp.LpProblem("Maximize_Coverage_With_Premium_Constraint", pulp.LpMaximize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")

    prob += pulp.lpSum(
        df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i]
        for i in range(num_quotes)
    ), "Total_Coverage"

    prob += pulp.lpSum(
        df_quotes.loc[i, "Premium"] * x_vars[i]
        for i in range(num_quotes)
    ) <= premium_threshold, "Premium_Constraint"

    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            == layer_limits[idx]
        ), f"Layer_{layer}_Capacity"

    for carrier in required_carriers:
        indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            >= 0.001
        ), f"Required_{carrier}"

    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"

    if diversify and (max_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                prob += (
                    pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                    <= max_capacity_abs
                ), f"MaxCap_{carrier}_{layer}"

    if diversify and (min_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                available_capacity = sum(df_quotes.loc[i, "Capacity"] for i in indices)
                if available_capacity >= min_capacity_abs:
                    prob += (
                        pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                        >= min_capacity_abs
                    ), f"MinCap_{carrier}_{layer}"

    solver = pulp.GLPK_CMD(path="/opt/homebrew/bin/glpsol", msg=0)
    prob.solve(solver)

    if pulp.LpStatus[prob.status] != "Optimal":
        return None, None, pulp.LpStatus[prob.status]

    results = []
    for i in range(num_quotes):
        fraction = pulp.value(x_vars[i])
        if fraction is None or fraction < 1e-6:
            fraction = 0
        row = df_quotes.iloc[i].copy()
        row["FractionAllocated"] = fraction
        row["SignedCapacity"] = row["Capacity"] * fraction
        row["SignedPremium"] = row["Premium"] * fraction
        results.append(row)

    solution_df = pd.DataFrame(results)
    # Compute per-layer allocation percentages
    solution_df["AllocationPercentage"] = 0
    for layer in solution_df["Layer"].unique():
        layer_mask = solution_df["Layer"] == layer
        total_alloc = solution_df.loc[layer_mask, "SignedCapacity"].sum()
        if total_alloc > 0:
            solution_df.loc[layer_mask, "AllocationPercentage"] = (solution_df.loc[layer_mask, "SignedCapacity"] / total_alloc * 100)

    achieved_premium = solution_df["SignedPremium"].sum()
    total_cap = solution_df["SignedCapacity"].sum()
    achieved_total_coverage = (solution_df["Coverage_Score"] * solution_df["SignedCapacity"]).sum()
    achieved_avg_coverage = achieved_total_coverage / total_cap if total_cap > 0 else 0
    bang_for_your_buck = achieved_total_coverage / achieved_premium if achieved_premium > 0 else 0

    metrics = {
        "Achieved Premium": achieved_premium,
        "Achieved Total Coverage": achieved_total_coverage,
        "Achieved Average Coverage": achieved_avg_coverage,
        "BangForYourBuck": bang_for_your_buck,
        "PremiumThreshold": premium_threshold
    }
    return solution_df, metrics, pulp.LpStatus[prob.status]

# -----------------------------------------------------------------------------
# Sidebar: User Preferences
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### Configure Your Preferences")
    with st.expander("Price and Coverage Preferences", expanded=False):
        premium_weight = st.slider(
            "Price Importance (1 = Least, 10 = Most)",
            min_value=1, max_value=10, value=5, step=1
        )
        coverage_weight = st.slider(
            "Coverage Importance (1 = Least, 10 = Most)",
            min_value=1, max_value=10, value=5, step=1
        )
    min_credit_str = st.selectbox(
        "Credit Rating",
        options=["B Rating and Above", "A Rating and Above", "AA Rating and Above"],
        index=0
    )
    credit_threshold = {"B Rating and Above": 1, "A Rating and Above": 2, "AA Rating and Above": 5}[min_credit_str]
    carrier_layers = df_quotes.groupby("Carrier")["Layer"].unique().to_dict()
    carrier_options = [f"{carrier} (quoted: {', '.join(layers)})" for carrier, layers in carrier_layers.items()]
    display_to_carrier = {f"{carrier} (quoted: {', '.join(layers)})": carrier for carrier, layers in carrier_layers.items()}
    required_display = st.multiselect("Select Required Carriers", options=list(display_to_carrier.keys()))
    required_carriers = [display_to_carrier[opt] for opt in required_display]
    diversify = st.checkbox("Diversify Carriers (limit capacity per carrier)")
    max_capacity_abs = None
    min_capacity_abs = None
    if diversify:
        min_capacity_abs = st.number_input(
            "Min Signed Capacity per Carrier ($M)",
            min_value=0.0, max_value=10.0, value=0.0, step=0.25, format="%.2f"
        )
        max_capacity_abs = st.number_input(
            "Max Signed Capacity per Carrier ($M)",
            min_value=0.5, max_value=10.0, value=2.0, step=0.25, format="%.2f"
        )
    if st.button("Run Optimisation"):
        st.session_state["user_params"] = {
            "premium_weight": premium_weight,
            "coverage_weight": coverage_weight,
            "credit_threshold": credit_threshold,
            "required_carriers": required_carriers,
            "diversify": diversify,
            "max_capacity_abs": max_capacity_abs,
            "min_capacity_abs": min_capacity_abs
        }
        with st.spinner("Optimising placement..."):
            df_opt, status = run_optimization_continuous(
                premium_weight, coverage_weight, required_carriers,
                credit_threshold, diversify, max_capacity_abs, min_capacity_abs
            )
        if df_opt is None:
            st.error(f"No feasible solution. Solver status: {status}")
            st.session_state["df_user_solution"] = None
        else:
            st.session_state["df_user_solution"] = df_opt
            st.success("Optimisation successful!")

# -----------------------------------------------------------------------------
# Top-Level Tabs for All Sections
# -----------------------------------------------------------------------------
tabs = st.tabs([
    "All Quotes & Totals",
    "Generate Placement Options",
    "Optimal Placement Structure",
    "View Other Options",
    "Comparison"
])

# -------------------- TAB: Raw Data & Totals --------------------
with tabs[0]:
    st.markdown("**Total Across All Quotes Received**")
    total_raw_premium = df_quotes["Premium"].sum()
    total_raw_capacity = df_quotes["Capacity"].sum()
    st.write(f"- Total Written Premium (all quotes): **${total_raw_premium/1000000:,.2f}M**")
    st.write(f"- Total Offered Capacity (all quotes): **${total_raw_capacity:.0f}M**")
    st.markdown("**All Quotes Received**")
    df_raw_display = df_quotes.drop(columns=["Preferred", "CreditRatingValue"]).copy()
    df_raw_display = df_raw_display.rename(columns={
        "Capacity": "Offered Capacity",
        "Premium": "Written Premium",
        "Coverage_Score": "Coverage Score (%)"
    })
    df_raw_display["Coverage Score (%)"] = df_raw_display["Coverage Score (%)"].apply(
        lambda x: f"{x*100:.0f}%" if pd.notna(x) else x
    )
    st.dataframe(df_raw_display, use_container_width=True)

# -------------------- TAB: Explore Placement Options --------------------
with tabs[1]:
    st.markdown("#### Generated Options")
    # 1) Get extreme solutions
    df_min, status_min = run_optimization_continuous(
        w_premium=1, w_coverage=0,
        required_carriers=[],
        min_credit=st.session_state["user_params"]["credit_threshold"],
        diversify=st.session_state["user_params"]["diversify"],
        max_capacity_abs=st.session_state["user_params"]["max_capacity_abs"],
        min_capacity_abs=st.session_state["user_params"]["min_capacity_abs"]
    )
    if df_min is None:
        st.error(f"Could not compute minimum premium solution. Status: {status_min}")
        st.stop()
    min_prem_value = df_min["SignedPremium"].sum()
    df_maxcov, status_maxcov = run_optimization_continuous(
        w_premium=0, w_coverage=1,
        required_carriers=[],
        min_credit=st.session_state["user_params"]["credit_threshold"],
        diversify=st.session_state["user_params"]["diversify"],
        max_capacity_abs=st.session_state["user_params"]["max_capacity_abs"],
        min_capacity_abs=st.session_state["user_params"]["min_capacity_abs"]
    )
    if df_maxcov is None:
        st.error(f"Could not compute maximum coverage solution. Status: {status_maxcov}")
        st.stop()
    premium_for_maxcov = df_maxcov["SignedPremium"].sum()
    st.write(f"Minimum Premium: ${min_prem_value:,.0f}")
    st.write(f"Premium at Maximum Coverage: ${premium_for_maxcov:,.0f}")
    st.markdown("#### Parameters")
    col1, col2, col3 = st.columns(3)
    with col1:
        num_candidates = st.slider(
            "Number of premium thresholds to test",
            min_value=10, max_value=10000, value=100, step=10, key="cand_slider"
        )
    with col2:
        prem_min_m = min_prem_value / 1e3
        prem_max_m = premium_for_maxcov / 1e3
        selected_premium_range_m = st.slider(
            "Select Achieved Premium Range",
            min_value=prem_min_m,
            max_value=prem_max_m,
            value=(prem_min_m, prem_max_m),
            step=0.1,
            format="%.1fK",
            key="filter_prem"
        )
    with col3:
        achieved_avg_cov_min = (df_min["Coverage_Score"] * df_min["SignedCapacity"]).sum() / (df_min["SignedCapacity"].sum()) if df_min["SignedCapacity"].sum() > 0 else 0
        achieved_avg_cov_max = (df_maxcov["Coverage_Score"] * df_maxcov["SignedCapacity"]).sum() / (df_maxcov["SignedCapacity"].sum()) if df_maxcov["SignedCapacity"].sum() > 0 else 1
        achieved_avg_cov_min_pct = achieved_avg_cov_min * 100
        achieved_avg_cov_max_pct = achieved_avg_cov_max * 100
        selected_coverage_range_pct = st.slider(
            "Select Achieved Average Coverage Range",
            min_value=achieved_avg_cov_min_pct,
            max_value=achieved_avg_cov_max_pct,
            value=(achieved_avg_cov_min_pct, achieved_avg_cov_max_pct),
            step=0.5,
            format="%.1f%%",
            key="filter_cov"
        )
    candidate_premiums = np.linspace(min_prem_value, premium_for_maxcov, num_candidates)
    solutions_eps = []
    for candidate in candidate_premiums:
        sol_df, metrics, status = run_optimization_max_coverage_with_premium_constraint(
            premium_threshold=candidate,
            required_carriers=st.session_state["user_params"]["required_carriers"],
            min_credit=st.session_state["user_params"]["credit_threshold"],
            diversify=st.session_state["user_params"]["diversify"],
            max_capacity_abs=st.session_state["user_params"]["max_capacity_abs"],
            min_capacity_abs=st.session_state["user_params"]["min_capacity_abs"]
        )
        if metrics is not None:
            metrics["Candidate Premium Threshold"] = candidate
            metrics["SolutionDF"] = sol_df
            solutions_eps.append(metrics)
    if not solutions_eps:
        st.warning("No feasible solutions found in the premium sweep.")
        st.stop()
    else:
        df_eps = pd.DataFrame(solutions_eps)
        df_eps["Achieved Premium (M)"] = df_eps["Achieved Premium"] / 1e3
        df_eps["Achieved Coverage (%)"] = df_eps["Achieved Average Coverage"] * 100
        premium_min_value = selected_premium_range_m[0] * 1e3
        premium_max_value = selected_premium_range_m[1] * 1e3
        coverage_min_value = selected_coverage_range_pct[0] / 100.0
        coverage_max_value = selected_coverage_range_pct[1] / 100.0
        df_filtered = df_eps[
            (df_eps["Achieved Premium"] >= premium_min_value) &
            (df_eps["Achieved Premium"] <= premium_max_value) &
            (df_eps["Achieved Average Coverage"] >= coverage_min_value) &
            (df_eps["Achieved Average Coverage"] <= coverage_max_value)
        ].copy()
        df_display = df_filtered.copy()
        df_display = df_display.rename(columns={
            "Achieved Premium": "Total Signed Premium",
            "Achieved Average Coverage": "Total Program Coverage"
        })
        df_display["Total Signed Premium"] = df_display["Total Signed Premium"].apply(lambda x: f"${x:,.2f}")
        df_display["Total Program Coverage"] = df_display["Total Program Coverage"].apply(lambda x: f"{x*100:.2f}%")
        cols_to_drop = ["Achieved Total Coverage", "BangForYourBuck", "PremiumThreshold",
                        "Candidate Premium Threshold", "Achieved Premium (M)", "Achieved Coverage (%)", "SolutionDF", "Option"]
        df_display = df_display.drop(columns=[col for col in cols_to_drop if col in df_display.columns])
        df_display = df_display.reset_index(drop=True)
        df_display.index = df_display.index + 1
        df_display.index.name = "Option"
        st.write("### Generated Options")
        st.dataframe(df_display, use_container_width=True)

# -------------------- TAB: Optimal Placement Structure --------------------
with tabs[2]:
    if len(df_filtered) == 0:
        st.warning("No candidates in the filtered range.")
    else:
        optimal_idx = df_filtered["BangForYourBuck"].idxmax()
        optimal_solution_row = df_filtered.loc[optimal_idx]
        df_optimal_summary = pd.DataFrame([optimal_solution_row]).drop(columns=["SolutionDF"], errors="ignore")
        df_optimal_summary = df_optimal_summary[["Achieved Premium", "Achieved Average Coverage"]]
        df_optimal_summary = df_optimal_summary.rename(columns={
            "Achieved Premium": "Total Signed Premium",
            "Achieved Average Coverage": "Total Program Coverage"
        })
        df_optimal_summary["Total Signed Premium"] = df_optimal_summary["Total Signed Premium"].apply(lambda x: f"${int(round(x)):,}")
        df_optimal_summary["Total Program Coverage"] = df_optimal_summary["Total Program Coverage"].apply(lambda x: f"{round(x*100)}%")
        st.session_state["optimal_df"] = df_optimal_summary.copy()
        st.markdown("#### Optimal Placement Structure")
        if "Carrier" in df_optimal_summary.columns:
            st.dataframe(df_optimal_summary.set_index("Carrier"), use_container_width=True)
        else:
            st.dataframe(df_optimal_summary, use_container_width=True)
        optimal_threshold = optimal_solution_row["Candidate Premium Threshold"]
        optimal_df, optimal_metrics, status_opt = run_optimization_max_coverage_with_premium_constraint(
            premium_threshold=optimal_threshold,
            required_carriers=st.session_state["user_params"]["required_carriers"],
            min_credit=st.session_state["user_params"]["credit_threshold"],
            diversify=st.session_state["user_params"]["diversify"],
            max_capacity_abs=st.session_state["user_params"]["max_capacity_abs"],
            min_capacity_abs=st.session_state["user_params"]["min_capacity_abs"]
        )
        if optimal_df is not None:
            st.session_state["optimal_detailed_df"] = optimal_df.copy()
            df_display_opt = optimal_df.copy()
            if "FractionAllocated" in df_display_opt.columns:
                df_display_opt = df_display_opt[df_display_opt["FractionAllocated"] != 0]
            for col in ["Preferred", "CreditRatingValue", "FractionAllocated"]:
                if col in df_display_opt.columns:
                    df_display_opt.drop(columns=col, inplace=True)
            df_display_opt = df_display_opt.rename(columns={
                "Premium": "Written Premium",
                "Capacity": "Offered Capacity",
                "Coverage_Score": "Coverage Score (%)",
                "CreditRating": "Credit Rating",
                "SignedCapacity": "Signed Capacity",
                "SignedPremium": "Signed Premium",
                "AllocationPercentage": "Share of Layer"
            })
            df_display_opt["Written Premium"] = df_display_opt["Written Premium"].apply(lambda x: f"${int(round(x)):,}")
            df_display_opt["Offered Capacity"] = df_display_opt["Offered Capacity"].apply(lambda x: f"${int(round(x*1e6)):,}")
            df_display_opt["Coverage Score (%)"] = df_display_opt["Coverage Score (%)"].apply(lambda x: f"{round(x*100)}%")
            df_display_opt["Signed Capacity"] = df_display_opt["Signed Capacity"].apply(lambda x: f"${int(round(x*1e6)):,}")
            df_display_opt["Signed Premium"] = df_display_opt["Signed Premium"].apply(lambda x: f"${int(round(x)):,}")
            df_display_opt["Share of Layer"] = df_display_opt["Share of Layer"].apply(lambda x: f"{round(x)}%")
            
            view_mode_opt = st.radio("View Mode", options=["Capacity", "Security"], index=0, horizontal=True, key="opt_view")
            if view_mode_opt == "Capacity":
                fig_opt = plot_mudmap(optimal_df)
            else:
                fig_opt = plot_security_mudmap(optimal_df)
            st.plotly_chart(fig_opt, use_container_width=True, key="opt_mudmap")
        else:
            st.error("No detailed solution found for the optimal candidate.")
            
        if "Carrier" in df_display_opt.columns:
            df_display_opt = df_display_opt.set_index("Carrier")
        st.markdown("##### Detailed Optimal Placement Structure")
        st.dataframe(df_display_opt, use_container_width=True)

# -------------------- TAB: View Other Options --------------------
with tabs[3]:
    if len(df_filtered) == 0:
        st.warning("No Options in the filtered range.")
    else:
        candidate_options = []
        for idx, row in df_filtered.iterrows():
            label = (
                f"Option {idx}: Premium ${row['Achieved Premium']:,.0f}, "
                f"Coverage {row['Achieved Average Coverage']:.3f}"
            )
            candidate_options.append(label)
        selected_option = st.selectbox("Select Option to View", options=candidate_options, key="cand_sel")
        selected_index = candidate_options.index(selected_option)
        row_label = df_filtered.index[selected_index]
        selected_candidate = df_filtered.loc[row_label]
        st.markdown("#### Placement Structure for Selected Option")
        selected_threshold = selected_candidate["Candidate Premium Threshold"]
        selected_df, selected_metrics, status_sel = run_optimization_max_coverage_with_premium_constraint(
            premium_threshold=selected_threshold,
            required_carriers=st.session_state["user_params"]["required_carriers"],
            min_credit=st.session_state["user_params"]["credit_threshold"],
            diversify=st.session_state["user_params"]["diversify"],
            max_capacity_abs=st.session_state["user_params"]["max_capacity_abs"],
            min_capacity_abs=st.session_state["user_params"]["min_capacity_abs"]
        )
        if selected_df is not None:
            st.session_state["user_selected_candidate_df"] = selected_df.copy()
            df_display_sel = selected_df.copy()
            if "FractionAllocated" in df_display_sel.columns:
                df_display_sel = df_display_sel[df_display_sel["FractionAllocated"] != 0]
            for col in ["Preferred", "CreditRatingValue", "FractionAllocated"]:
                if col in df_display_sel.columns:
                    df_display_sel.drop(columns=col, inplace=True)
            df_display_sel = df_display_sel.rename(columns={
                "Premium": "Written Premium",
                "Capacity": "Offered Capacity",
                "Coverage_Score": "Coverage Score (%)",
                "CreditRating": "Credit Rating",
                "SignedCapacity": "Signed Capacity",
                "SignedPremium": "Signed Premium",
                "AllocationPercentage": "Share of Layer"
            })
            df_display_sel["Written Premium"] = df_display_sel["Written Premium"].apply(lambda x: f"${int(round(x)):,}")
            df_display_sel["Offered Capacity"] = df_display_sel["Offered Capacity"].apply(lambda x: f"${int(round(x*1e6)):,}")
            df_display_sel["Coverage Score (%)"] = df_display_sel["Coverage Score (%)"].apply(lambda x: f"{round(x*100)}%")
            df_display_sel["Signed Capacity"] = df_display_sel["Signed Capacity"].apply(lambda x: f"${int(round(x*1e6)):,}")
            df_display_sel["Signed Premium"] = df_display_sel["Signed Premium"].apply(lambda x: f"${int(round(x)):,}")
            df_display_sel["Share of Layer"] = df_display_sel["Share of Layer"].apply(lambda x: f"{round(x)}%")
            view_mode_cand = st.radio("View Mode", options=["Capacity", "Security"], index=0, horizontal=True, key="cand_view")
            if view_mode_cand == "Capacity":
                fig_sel = plot_mudmap(selected_df)
            else:
                fig_sel = plot_security_mudmap(selected_df)
            st.plotly_chart(fig_sel, use_container_width=True, key="cand_mudmap")
        else:
            st.error("Failed to generate detailed solution for the selected candidate.")
        if "Carrier" in df_display_sel.columns:
            df_display_sel = df_display_sel.set_index("Carrier")
            st.dataframe(df_display_sel, use_container_width=True)

# -------------------- TAB: Comparison --------------------
with tabs[4]:
    optimal_detailed_df = st.session_state.get("optimal_detailed_df")
    if optimal_detailed_df is None:
        st.error("Optimal placement solution not available. Please run the Optimal Placement Structure tab first.")
        st.stop()
    user_candidate_df = st.session_state.get("user_selected_candidate_df")
    if user_candidate_df is None:
        st.info("User selected candidate not available. Using initial user solution.")
        user_candidate_df = st.session_state.get("df_user_solution")
        if user_candidate_df is None:
            st.error("No user solution available.")
            st.stop()
    user_alloc = user_candidate_df[user_candidate_df["SignedCapacity"] > 0].copy()
    optimal_alloc = optimal_detailed_df[optimal_detailed_df["SignedCapacity"] > 0].copy()
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    user_alloc["LayerOrder"] = user_alloc["Layer"].apply(lambda x: layer_order.get(x, 99))
    user_alloc = user_alloc.sort_values("LayerOrder")
    optimal_alloc["LayerOrder"] = optimal_alloc["Layer"].apply(lambda x: layer_order.get(x, 99))
    optimal_alloc = optimal_alloc.sort_values("LayerOrder")
    user_total_premium = user_alloc["SignedPremium"].sum()
    user_total_capacity = user_alloc["SignedCapacity"].sum()
    user_avg_cov = (user_alloc["Coverage_Score"] * user_alloc["SignedCapacity"]).sum() / user_total_capacity if user_total_capacity > 0 else 0
    optimal_total_premium = optimal_alloc["SignedPremium"].sum()
    optimal_total_capacity = optimal_alloc["SignedCapacity"].sum()
    optimal_avg_cov = (optimal_alloc["Coverage_Score"] * optimal_alloc["SignedCapacity"]).sum() / optimal_total_capacity if optimal_total_capacity > 0 else 0
    premium_diff = user_total_premium - optimal_total_premium
    coverage_diff = (user_avg_cov - optimal_avg_cov) * 100  # in percentage points
    premium_text_color = "#e06666" if premium_diff > 0 else "#8fce00"
    coverage_text_color = "#8fce00" if coverage_diff > 0 else "#e06666"
    st.markdown("### Overall Placement Comparison")
    st.markdown(f"""
    **Differences:**<br>
    Premium Difference = **<span style='color: {premium_text_color};'>${premium_diff:,.0f}</span>**<br>
    Coverage Difference = **<span style='color: {coverage_text_color};'>{coverage_diff:.0f}%</span>**
    """, unsafe_allow_html=True)
    comp_view_mode = st.radio("Comparison View Mode", options=["Capacity", "Security"], index=0, horizontal=True)
    col_left, col_right = st.columns(2)
    desired_order = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    with col_left:
        st.markdown("**User Selected Placement**")
        if comp_view_mode == "Capacity":
            fig_user = plot_mudmap(user_alloc)
        else:
            fig_user = plot_security_mudmap(user_alloc)
        fig_user.update_yaxes(categoryorder="array", categoryarray=desired_order)
        st.plotly_chart(fig_user, use_container_width=True)
        st.markdown(f"**Total Signed Premium:** ${user_total_premium:,.0f}  \n**Average Coverage Score:** {user_avg_cov*100:.0f}%")
    with col_right:
        st.markdown("**Optimal Placement**")
        if comp_view_mode == "Capacity":
            fig_opt = plot_mudmap(optimal_alloc)
        else:
            fig_opt = plot_security_mudmap(optimal_alloc)
        fig_opt.update_yaxes(categoryorder="array", categoryarray=desired_order)
        st.plotly_chart(fig_opt, use_container_width=True, key="comp_mudmap")
        st.markdown(f"**Total Signed Premium:** ${optimal_total_premium:,.0f}  \n**Average Coverage Score:** {optimal_avg_cov*100:.0f}%")
