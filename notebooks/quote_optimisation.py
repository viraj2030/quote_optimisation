import streamlit as st
import pandas as pd
import numpy as np
import pulp
import plotly.express as px
import os

# -----------------------------------------------------------------------------
# Ensure Homebrew's bin is in the PATH so CBC can be found on macOS
# -----------------------------------------------------------------------------
os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ.get("PATH", "")

# -----------------------------------------------------------------------------
# Set page configuration
# -----------------------------------------------------------------------------
st.set_page_config(page_title="Insurance Placement Optimizer", layout="wide")

# -----------------------------------------------------------------------------
# Custom CSS for aesthetics
# -----------------------------------------------------------------------------
st.markdown(
    """
    <style>
    body { background-color: white; }
    .reportview-container .main .block-container { padding-top: 2rem; padding-bottom: 2rem; }
    h1 { font-size: 2.5rem; font-weight: bold; }
    .stMetric { font-size: 1.5rem; }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# Page Title
# -----------------------------------------------------------------------------
st.title("Insurance Placement Optimizer")

# -----------------------------------------------------------------------------
# Data Preparation
# -----------------------------------------------------------------------------
# We have three layers; each layer has a $10M capacity.
layer_limits = [10e6, 10e6, 10e6]

data = {
    "Carrier": [
        "AIG", "Allianz", "AXA", "Zurich", "Chubb", "Liberty", "Berkshire", "Travelers", "Munich Re", "Swiss Re",
        "Hannover Re", "SCOR", "Partner Re", "Renaissance Re", "Arch Capital", "Axis Capital", "AIG", "Endurance", "Aspen Re", "Validus",
        "Chubb", "Catlin", "Allied World", "Hiscox", "Amlin", "Beazley", "AXA", "Brit", "MS Amlin", "XL Catlin"
    ],
    "Layer": [
        "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M", "Primary $10M",
        "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M", "$10M xs $10M",
        "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M", "$10M xs $20M"
    ],
    "Premium": [
        1243213, 1020361, 1118486, 1218843, 1022174, 1278701, 1110417, 1039896, 1289711, 1277751,
        876440, 928673, 968621, 887314, 820072, 832378, 895831, 803424, 998271, 912313,
        635167, 668959, 698410, 717871, 679425, 664197, 606473, 794058, 664465, 775569
    ],
    "Capacity": [
        2, 4, 3, 5, 4, 5, 6, 2, 1, 2,
        2, 5, 4, 5, 3, 2, 3, 4, 5, 3,
        3, 1, 4, 2, 4, 2, 1, 3, 3, 5
    ],
    "Coverage_Score": [
        0.97, 0.93, 0.80, 0.91, 0.83, 0.82, 0.92, 0.98, 0.95, 0.94,
        0.78, 0.93, 0.75, 1.00, 0.76, 0.90, 0.89, 1.00, 0.97, 0.86,
        0.91, 0.86, 0.87, 0.80, 0.77, 0.87, 0.86, 0.81, 0.77, 0.82
    ],
    "Preferred": [
        0, 0, 0, 0, 0, 0, 1, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        0, 0, 0, 0, 0, 0, 1, 0, 0, 0
    ],
    "CreditRating": [
        "A", "A", "A", "B", "AA", "B", "A", "A", "A", "A",
        "B", "A", "B", "A", "A", "AA", "A", "AA", "AA", "B",
        "B", "AA", "AA", "B", "B", "B", "A", "B", "AA", "AA"
    ],
    "CreditRatingValue": [
        2, 2, 2, 1, 3, 1, 2, 2, 2, 2,
        1, 2, 1, 2, 2, 3, 2, 3, 3, 1,
        1, 3, 3, 1, 1, 1, 2, 1, 3, 3
    ]
}

df_quotes = pd.DataFrame(data)
# Convert capacities: multiply by 1e6 (so 2 becomes 2,000,000)
df_quotes["Capacity"] = df_quotes["Capacity"] * 1e6
layer_limits = [10e6, 10e6, 10e6]

# -----------------------------------------------------------------------------
# Update Credit Ratings
# -----------------------------------------------------------------------------
highest_ratings = df_quotes.groupby("Carrier")["CreditRatingValue"].max().to_dict()
rev_credit_mapping = {1: "B", 2: "A", 3: "AA"}

def update_rating(row):
    carrier = row["Carrier"]
    highest = highest_ratings[carrier]
    row["CreditRatingValue"] = highest
    row["CreditRating"] = rev_credit_mapping[highest]
    return row

df_quotes = df_quotes.apply(update_rating, axis=1)

# -----------------------------------------------------------------------------
# Calculate Dynamic Ranges for Premium and Coverage
# -----------------------------------------------------------------------------
layers_list = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
layer_min_premiums = []
layer_max_premiums = []
for layer in layers_list:
    quotes_layer = df_quotes[df_quotes["Layer"] == layer]
    layer_min_premiums.append(quotes_layer["Premium"].min())
    layer_max_premiums.append(quotes_layer["Premium"].max())
target_premium_min_bound = sum(layer_min_premiums)
target_premium_max_bound = sum(layer_max_premiums)
min_coverage = df_quotes["Coverage_Score"].min()
max_coverage = df_quotes["Coverage_Score"].max()

# -----------------------------------------------------------------------------
# Pure Baseline Optimization Functions (for Normalization)
# -----------------------------------------------------------------------------
def pure_premium_opt():
    # Minimize total premium ignoring coverage (trivial coverage constraint)
    prob = pulp.LpProblem("Pure_Premium", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    prob += pulp.lpSum(df_quotes.loc[i, "Premium"] * x_vars[i] for i in range(num_quotes)), "Total_Premium"
    for idx, layer in enumerate(layers_list):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) == layer_limits[idx]), f"Layer_{layer}_Capacity"
        prob += (pulp.lpSum(df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) >= 0), f"Layer_{layer}_Coverage"
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < 1:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)
    return pulp.value(prob.objective)

def pure_coverage_opt():
    # Maximize total coverage
    prob = pulp.LpProblem("Pure_Coverage", pulp.LpMaximize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    prob += pulp.lpSum(df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i] for i in range(num_quotes)), "Total_Coverage"
    for idx, layer in enumerate(layers_list):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) == layer_limits[idx]), f"Layer_{layer}_Capacity"
        prob += (pulp.lpSum(df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) >= 0), f"Layer_{layer}_Coverage"
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < 1:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)
    total_cov = pulp.value(prob.objective)
    achieved_avg_cov = total_cov / sum(layer_limits)
    return achieved_avg_cov, total_cov

# Compute Baseline Normalization Values
P0 = pure_premium_opt()  # Pure premium minimum baseline.
achieved_cheapest_premium = P0  # Define achieved_cheapest_premium as P0.
achieved_best_coverage_avg, _ = pure_coverage_opt()
total_capacity = sum(layer_limits)
C0 = achieved_best_coverage_avg * total_capacity  # Normalization for total coverage.

# -----------------------------------------------------------------------------
# Combined Optimization Function with Weighting
# -----------------------------------------------------------------------------
def run_optimization_continuous(target_max_premium, target_min_coverage, required_carriers, min_credit, diversify, max_capacity_abs, premium_weight, model_type="user"):
    # Objective: minimize premium_weight*(TotalPremium/P0) - (1-premium_weight)*(TotalCoverage/C0) + slack penalties.
    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    
    p_slack = pulp.LpVariable("p_slack", lowBound=0, cat="Continuous")
    layers_list_def = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    c_slack = {layer: pulp.LpVariable(f"c_slack_{layer}", lowBound=0, cat="Continuous") for layer in layers_list_def}
    
    M_p = 1e6
    M_c = 1e6
    
    total_premium = pulp.lpSum(df_quotes.loc[i, "Premium"] * x_vars[i] for i in range(num_quotes))
    total_coverage = pulp.lpSum(df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i] for i in range(num_quotes))
    
    objective = premium_weight * (total_premium / P0) - (1 - premium_weight) * (total_coverage / C0) + M_p * p_slack + M_c * pulp.lpSum(c_slack[layer] for layer in layers_list_def)
    prob += objective, "Objective_Combined"
    
    layer_order_map = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    for idx, layer in enumerate(layers_list_def):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) == layer_limits[idx]), f"Layer_{layer}_Capacity"
        prob += (pulp.lpSum(df_quotes.loc[i, "Coverage_Score"] * df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                 >= target_min_coverage * layer_limits[idx] - c_slack[layer]), f"Layer_{layer}_Coverage"
    
    prob += (total_premium <= target_max_premium + p_slack), "Total_Premium_Constraint"
    
    if model_type == "user":
        for carrier in required_carriers:
            indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
            prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) >= 0.001 * 1e6), f"Required_{carrier}"
    
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
    
    if diversify:
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layers_list_def):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices) <= max_capacity_abs * 1e6), f"Max_Capacity_{carrier}_{layer}"
    
    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)
    status = pulp.LpStatus[prob.status]
    
    results = []
    for i in range(num_quotes):
        fraction = pulp.value(x_vars[i])
        if fraction is None or fraction < 1e-6:
            fraction = 0
        row = df_quotes.iloc[i].copy()
        row["FractionAllocated"] = fraction
        row["SignedCapacity"] = row["Capacity"] * fraction
        row["SignedPremium"] = row["Premium"] * fraction
        row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limits[layer_order_map[row["Layer"]]]) * 100
        results.append(row)
    df_result = pd.DataFrame(results)
    
    premium_slack_value = pulp.value(p_slack)
    coverage_slacks = {layer: pulp.value(c_slack[layer]) for layer in layers_list_def}
    
    return df_result, status, premium_slack_value, coverage_slacks

# -----------------------------------------------------------------------------
# Mudmap Visualization Function
# -----------------------------------------------------------------------------
def plot_mudmap(df_solution):
    df_plot = df_solution[df_solution["SignedCapacity"] > 0].copy()
    df_plot["AllocationPercentage"] = df_plot["AllocationPercentage"].clip(lower=0)
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    df_plot["LayerOrder"] = df_plot["Layer"].apply(lambda x: layer_order[x])
    df_plot = df_plot.sort_values(["LayerOrder", "Carrier"])
    
    fig = px.bar(
        df_plot,
        x="AllocationPercentage",
        y="Layer",
        color="Carrier",
        orientation="h",
        text=df_plot["AllocationPercentage"].apply(lambda x: f"{x:.2f}%"),
        title="Optimized Mudmap (Allocation by Layer)"
    )
    fig.update_layout(barmode="stack", xaxis_title="Capacity Allocated (% of 100)", yaxis_title="Layer")
    return fig

# -----------------------------------------------------------------------------
# Build the App Interface (Tabs)
# -----------------------------------------------------------------------------
tab1, tab2, tab3 = st.tabs(["Raw Quote Mudmap", "Baseline Model Optimization", "User Preference Optimization"])

# ----- TAB 1: Raw Quote Mudmap -----
with tab1:
    st.header("Raw Quote Mudmap (Quotes Received)")
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    df_sorted = df_quotes.sort_values(by=["Layer", "Carrier"], key=lambda col: col.map(layer_order)).reset_index(drop=True)
    
    def apply_background_color(row):
        if row["Layer"] == "Primary $10M":
            return ['background-color: #FCFAFA'] * len(row)
        elif row["Layer"] == "$10M xs $10M":
            return ['background-color: #C8D3D5'] * len(row)
        elif row["Layer"] == "$10M xs $20M":
            return ['background-color: #A4B8C4'] * len(row)
        else:
            return [''] * len(row)
    
    st.dataframe(df_sorted.style.apply(apply_background_color, axis=1), use_container_width=True)
    st.markdown("---")
    st.subheader("Visual Mudmap (Raw Data)")
    capacity_by_layer = df_quotes.groupby("Layer")["Capacity"].sum().reset_index()
    capacity_by_layer["CapacityPercentage"] = capacity_by_layer.apply(
        lambda row: (row["Capacity"] / layer_limits[layer_order[row["Layer"]]]) * 100, axis=1
    )
    fig_raw = px.bar(
        capacity_by_layer,
        x="CapacityPercentage",
        y="Layer",
        orientation="h",
        title="Raw Capacity by Layer (Percentage)",
        color_discrete_sequence=["#FFA500"]
    )
    fig_raw.update_layout(xaxis_title="Capacity Allocated (%)", yaxis_title="Layer")
    st.plotly_chart(fig_raw, use_container_width=True)

# ----- TAB 2: Baseline Model Optimization -----
with tab2:
    st.header("Baseline Model Optimization")
    st.markdown("<b>This model uses fixed targets (Premium and Coverage) without required carriers.</b>", unsafe_allow_html=True)
    st.markdown("""
    **Baseline Reference:**  
    This represents the ideal outcome when optimizing solely for the lowest premium.
    """)
    baseline_target_premium = achieved_cheapest_premium
    baseline_target_coverage = min_coverage
    if st.button("Generate Baseline Optimization"):
        with st.spinner("Optimizing baseline placement..."):
            df_baseline, status, p_slack, c_slacks = run_optimization_continuous(
                baseline_target_premium, baseline_target_coverage, required_carriers=[], min_credit=1,
                diversify=False, max_capacity_abs=10, premium_weight=1.0, model_type="baseline"
            )
        if df_baseline is None:
            st.error("No feasible solution was found for the baseline model.")
        else:
            st.success("Baseline optimization complete!")
            st.subheader("Baseline Optimized (Signed) Placement Mudmap")
            df_baseline_filtered = df_baseline[df_baseline["SignedCapacity"] > 0].drop(columns=["Preferred", "CreditRating", "CreditRatingValue", "FractionAllocated"])
            st.dataframe(df_baseline_filtered.sort_values(["Layer", "Carrier"]).reset_index(drop=True), use_container_width=True)
            total_base_premium = df_baseline["SignedPremium"].sum()
            baseline_avg_cov = (df_baseline["Coverage_Score"] * df_baseline["SignedCapacity"]).sum() / df_baseline["SignedCapacity"].sum()
            st.markdown(f"<h3>Total Signed Premium (Baseline): ${total_base_premium/1e6:.2f}M</h3>", unsafe_allow_html=True)
            st.markdown(f"<h3>Baseline Weighted Average Coverage: {baseline_avg_cov:.2f}</h3>", unsafe_allow_html=True)
            fig_base = plot_mudmap(df_baseline)
            st.plotly_chart(fig_base, use_container_width=True)
            st.markdown("""
            **Interpretation:**  
            This baseline structure represents the ideal outcome when optimizing purely for the lowest premium.
            """)

# ----- TAB 3: User Preference Optimization -----
with tab3:
    st.header("User Preference Optimization")
    st.markdown("<b>Parameter Explanation:</b>", unsafe_allow_html=True)
    with st.expander("What do the parameters mean?"):
        st.markdown(f"""
        - **Target Maximum Premium:**  
          Set the maximum total premium you are willing to pay.  
          (Achievable Range: ${target_premium_min_bound/1e6:.2f}M to ${target_premium_max_bound/1e6:.2f}M)
        - **Target Minimum Coverage Score:**  
          Set the minimum weighted average coverage score for each layer.  
          (Range: {min_coverage:.2f} to {max_coverage:.2f})
        - **Premium Weight:**  
          Adjust the trade-off between premium and coverage.  
          (1 = pure premium minimization; 0 = pure coverage maximization)
        - **Minimum S&P Credit Rating:**  
          Choose the minimum acceptable credit rating.
        """)
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        target_premium_m = st.slider(
            "Target Maximum Total Premium (in M)",
            float(target_premium_min_bound/1e6),
            float(target_premium_max_bound/1e6),
            float(np.median([target_premium_min_bound/1e6, target_premium_max_bound/1e6])),
            step=0.01,
            format="$%.2fM"
        )
        target_premium = target_premium_m * 1e6
    with col2:
        target_coverage = st.slider(
            "Target Minimum Coverage Score",
            float(min_coverage),
            float(max_coverage),
            float(np.median([min_coverage, max_coverage])),
            step=0.01
        )
    with col3:
        premium_weight = st.slider(
            "Premium Weight (0 = pure coverage, 1 = pure premium)",
            0.0, 1.0, 0.5, step=0.01, format="%.2f"
        )
    with col4:
        min_credit_str = st.selectbox("Minimum S&P Credit Rating", options=["B and above", "A and above", "AA and above"])
    credit_threshold = {"B and above": 1, "A and above": 2, "AA and above": 3}[min_credit_str]
    
    # Baseline Reference using pure optimization functions.
    cheapest_premium_value = pure_premium_opt()
    best_coverage_option, _ = pure_coverage_opt()
    
    st.markdown("<b>Baseline Reference:</b>", unsafe_allow_html=True)
    st.markdown(f"**Achievable Premium Range:** ${target_premium_min_bound/1e6:.2f}M to ${target_premium_max_bound/1e6:.2f}M")
    st.markdown(f"**Baseline (Cheapest) Premium:** ${cheapest_premium_value/1e6:.2f}M")
    st.markdown(f"**Baseline (Best) Coverage:** {best_coverage_option:.2f}")
    
    # Required carriers selection.
    carrier_layers = df_quotes.groupby("Carrier")["Layer"].unique().to_dict()
    carrier_options = [f"{carrier} (quoted: {', '.join(layers_list)})" for carrier, layers_list in carrier_layers.items()]
    display_to_carrier = {f"{carrier} (quoted: {', '.join(layers_list)})": carrier for carrier, layers_list in carrier_layers.items()}
    required_display = st.multiselect("Select Required Carriers (must be present)", options=carrier_options)
    required_carriers = [display_to_carrier[opt] for opt in required_display]
    
    # Diversification: Maximum absolute signed capacity per carrier per layer (in M).
    diversify = st.checkbox("Diversify Carriers (Counterparty Risk)")
    max_capacity_abs = 10.0
    if diversify:
        max_capacity_abs = st.slider("Maximum Capacity for Any Carrier (in M)", 0.0, 10.0, 2.0, step=0.5, format="$%.2fM")
    
    if st.button("Generate Optimization (User Preference)"):
        with st.spinner("Optimizing placement based on your preferences..."):
            df_optimized, status, p_slack, c_slacks = run_optimization_continuous(
                target_premium, target_coverage, required_carriers, credit_threshold, diversify, max_capacity_abs, premium_weight, model_type="user"
            )
        if df_optimized is None:
            st.error("No feasible solution was found even after relaxing constraints.")
        else:
            achieved_total_premium = df_optimized["SignedPremium"].sum()
            overall_coverage = (df_optimized["Coverage_Score"] * df_optimized["SignedCapacity"]).sum() / df_optimized["SignedCapacity"].sum()
            premium_deviation = target_premium - achieved_total_premium
            coverage_deviation = target_coverage - overall_coverage
            if premium_deviation >= 0:
                premium_message = f"Target premium met (achieved ${achieved_total_premium/1e6:.2f}M)."
            else:
                premium_message = f"Premium constraint relaxed by ${-premium_deviation/1e6:.2f}M."
            if coverage_deviation <= 0:
                coverage_message = f"Target coverage met (achieved {overall_coverage:.2f})."
            else:
                coverage_message = f"Coverage constraint relaxed by {coverage_deviation:.2f} points."
            if premium_deviation >= 0 and coverage_deviation <= 0:
                slack_report = "All target constraints were met."
            else:
                slack_report = "Some targets were relaxed. " + premium_message + " " + coverage_message
            
            st.success("Optimization complete!")
            st.subheader("Optimized (Signed) Placement Mudmap")
            df_optimized_filtered = df_optimized[df_optimized["SignedCapacity"] > 0].drop(columns=["Preferred", "CreditRating", "CreditRatingValue", "FractionAllocated"])
            st.dataframe(df_optimized_filtered.sort_values(["Layer", "Carrier"]).reset_index(drop=True), use_container_width=True)
            st.markdown(f"<h3>Total Signed Premium: ${achieved_total_premium/1e6:.2f}M</h3>", unsafe_allow_html=True)
            total_signed_capacity = df_optimized.groupby("Layer")["SignedCapacity"].sum().sum()
            st.markdown(f"<h3>Total Signed Capacity: ${total_signed_capacity/1e6:.2f}M</h3>", unsafe_allow_html=True)
            st.markdown(f"<b>Constraint Report:</b> {slack_report}")
            fig_mudmap = plot_mudmap(df_optimized)
            st.plotly_chart(fig_mudmap, use_container_width=True)
            
            st.markdown("<b>Trade-off Comparison:</b>", unsafe_allow_html=True)
            colA, colB, colC = st.columns(3)
            with colA:
                st.markdown(f"**Cheapest Premium Option:** ${cheapest_premium_value/1e6:.2f}M")
            with colB:
                st.markdown(f"**Best Coverage Option:** Avg Coverage = {best_coverage_option:.2f}")
            with colC:
                st.markdown(f"**Your Option:** ${achieved_total_premium/1e6:.2f}M, Avg Coverage = {overall_coverage:.2f}")
            st.markdown(f"**Target Premium:** ${target_premium/1e6:.2f}M &nbsp;&nbsp;&nbsp; **Target Coverage:** {target_coverage:.2f}")
            st.markdown("""
            **Interpretation:**  
            - The premium weight slider adjusts the trade-off between minimizing premium and maximizing coverage.
            - A premium weight of 1 yields the pure minimum premium solution; 0 yields the best coverage solution.
            - The trade-off comparisons show how your chosen targets compare with the ideal baselines.
            """)
