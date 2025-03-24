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
# Set the page configuration as the very first Streamlit command
# -----------------------------------------------------------------------------
st.set_page_config(page_title="Insurance Placement Optimizer", layout="wide")

# -----------------------------------------------------------------------------
# Custom CSS for aesthetics
# -----------------------------------------------------------------------------
st.markdown(
    """
    <style>
    body {
        background-color: white;
    }
    .reportview-container .main .block-container{
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    h1 {
        font-size: 2.5rem;
        font-weight: bold;
    }
    .stMetric {
        font-size: 1.5rem;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -----------------------------------------------------------------------------
# Page Title and Configuration
# -----------------------------------------------------------------------------
st.title("Insurance Placement Optimizer")

# -----------------------------------------------------------------------------
# Generate Synthetic Quote Data with Credit Ratings
# -----------------------------------------------------------------------------
layer_limits = [10, 10, 10]

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
        1343213, 1020361, 1218486, 1218843, 1022174, 1278701, 1210417, 1039896, 1289711, 1277751,
        976440, 928673, 968621, 1007314, 820072, 732378, 895831, 903424, 998271, 912313,
        635167, 668959, 698410, 717871, 579425, 664197, 606473, 794058, 664465, 775569
    ],
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

# -----------------------------------------------------------------------------
# Update Credit Ratings: Ensure for each carrier the rating is the highest encountered.
# Mapping: 1 = B, 2 = A, 3 = AA.
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
# Display Raw Totals
# -----------------------------------------------------------------------------
total_raw_premium = df_quotes["Premium"].sum()
total_raw_capacity = df_quotes["Capacity"].sum()
st.markdown(f"<b>Raw Total Premium (all quotes):</b> ${total_raw_premium:,}", unsafe_allow_html=True)
st.markdown(f"<b>Raw Total Capacity (all quotes):</b> {total_raw_capacity} million", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Define the Continuous Optimization Function
# -----------------------------------------------------------------------------
def run_optimization_continuous(w_premium, w_coverage, required_carriers, min_credit, diversify, max_capacity_pct, model_type="user"):
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
   
    for idx, layer in enumerate(["Primary $10M", "$10M xs $10M", "$10M xs $20M"]):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                 == layer_limits[idx]), f"Layer_{layer}_Capacity"
   
    if model_type == "user":
        for carrier in required_carriers:
            indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
            prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                     >= 0.001), f"Required_{carrier}"
   
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
   
    if diversify:
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(["Primary $10M", "$10M xs $10M", "$10M xs $20M"]):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                         <= max_capacity_pct / 100 * layer_limits[idx]), f"Max_Capacity_{carrier}_{layer}"
   
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
        layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
        row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limits[layer_order[row["Layer"]]]) * 100
        results.append(row)
    df_result = pd.DataFrame(results)
    return df_result, pulp.LpStatus[prob.status]

# -----------------------------------------------------------------------------
# Create a Function for the Mudmap Visualization
# -----------------------------------------------------------------------------
def plot_mudmap(df_solution):
    df_plot = df_solution.copy()
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
        text=df_plot["AllocationPercentage"].apply(lambda x: f"{x:.1f}%"),
        title="Optimized Mudmap (Allocation by Layer)"
    )
    fig.update_layout(barmode="stack", xaxis_title="Capacity Allocated (% of 100)", yaxis_title="Layer")
    return fig

# -----------------------------------------------------------------------------
# Build the Streamlit App Interface with Tabs
# -----------------------------------------------------------------------------
# Removed the Baseline Model Optimization tab.
tab1, tab2 = st.tabs(["Raw Quote Mudmap", "User Preference Optimization"])
 
# ----- TAB 1: Raw Quote Mudmap -----
with tab1:
    st.header("Raw Quote Mudmap (Quotes Received)")
   
    # Sort by layer and carrier (using fixed layer order)
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
 
# ----- TAB 2: User Preference Optimization -----
with tab2:
    st.header("User Preference Optimization")
    st.markdown("<b>Parameter Explanation:</b>", unsafe_allow_html=True)
    with st.expander("What do the parameters mean?"):
        st.markdown("""
        - **Price Importance (Premium Weight):**  
          A higher value (closer to 5) means you prioritize cost savings, so the optimizer will favor lower-premium quotes.  
        - **Coverage Importance (Coverage Weight):**  
          A higher value (closer to 5) means you want the best coverage quality, even if that means a higher premium.  
        - **Minimum S&P Credit Rating:**  
          Choose the minimum acceptable credit rating. "B and above" allows all, "A and above" excludes lower-rated carriers, and "AA and above" selects only the highest quality.
        """)
    col1, col2, col3 = st.columns(3)
    with col1:
        premium_weight = st.slider("Price Importance (1 = price less critical, 5 = cheapest preferred)", 1, 5, 3)
    with col2:
        coverage_weight = st.slider("Coverage Importance (1 = coverage less critical, 5 = highest coverage preferred)", 1, 5, 3)
    with col3:
        min_credit_str = st.selectbox("Minimum S&P Credit Rating", options=["B and above", "A and above", "AA and above"])
    credit_threshold = {"B and above": 1, "A and above": 2, "AA and above": 3}[min_credit_str]
   
    carrier_layers = df_quotes.groupby("Carrier")["Layer"].unique().to_dict()
    carrier_options = [f"{carrier} (quoted: {', '.join(layers_list)})" for carrier, layers_list in carrier_layers.items()]
    display_to_carrier = {f"{carrier} (quoted: {', '.join(layers_list)})": carrier for carrier, layers_list in carrier_layers.items()}
    required_display = st.multiselect("Select Required Carriers (must be present)", options=carrier_options)
    required_carriers = [display_to_carrier[opt] for opt in required_display]
   
    diversify = st.checkbox("Diversify Carriers (Counterparty Risk)")
    max_capacity_pct = 100
    if diversify:
        max_capacity_pct = st.slider("Maximum Capacity for Any Carrier (%)", 1, 100, 40)
   
    if st.button("Generate Optimization (User Preference)"):
        with st.spinner("Optimizing placement based on your preferences..."):
            df_optimized, status = run_optimization_continuous(
                premium_weight, coverage_weight, required_carriers, credit_threshold, diversify, max_capacity_pct, model_type="user"
            )
        if df_optimized is None:
            st.error("No feasible solution was found with these preferences. Please adjust your settings.")
        else:
            st.success("Optimization complete!")
            st.subheader("Optimized (Signed) Placement Mudmap")
            df_optimized_filtered = df_optimized[df_optimized["SignedCapacity"] > 0].drop(columns=["Preferred", "CreditRating", "CreditRatingValue", "FractionAllocated"])
            st.dataframe(df_optimized_filtered.sort_values(["Layer", "Carrier"]).reset_index(drop=True), use_container_width=True)
            total_signed_premium = df_optimized["SignedPremium"].sum()
            total_signed_capacity = df_optimized.groupby("Layer")["SignedCapacity"].sum().sum()
            st.markdown(f"<h3>Total Signed Premium: ${total_signed_premium:,.0f}</h3>", unsafe_allow_html=True)
            st.markdown(f"<h3>Total Signed Capacity: {total_signed_capacity:.1f} million</h3>", unsafe_allow_html=True)
            fig_mudmap = plot_mudmap(df_optimized)
            st.plotly_chart(fig_mudmap, use_container_width=True)
           
            st.markdown("<b>Trade-off Comparison Across All Parameter Permutations:</b>", unsafe_allow_html=True)
            with st.spinner("Generating trade-off comparisons for all combinations..."):
                # Prepare a list to store results for each permutation
                summary_results = []
                for p_weight in range(1, 6):
                    for c_weight in range(1, 6):
                        # Run optimization for each combination using the same other parameters
                        df_perm, status_perm = run_optimization_continuous(
                            p_weight, c_weight, required_carriers, credit_threshold, diversify, max_capacity_pct, model_type="user"
                        )
                        if (df_perm is None) or (df_perm["SignedCapacity"].sum() == 0):
                            total_prem = "No Solution"
                            avg_cov = "No Solution"
                        else:
                            total_prem = df_perm["SignedPremium"].sum()
                            # Calculate weighted average coverage score
                            total_cap = df_perm["SignedCapacity"].sum()
                            avg_cov = (df_perm["Coverage_Score"] * df_perm["SignedCapacity"]).sum() / total_cap if total_cap != 0 else 0
                            total_prem = f"${total_prem:,.0f}"
                            avg_cov = f"{avg_cov:.2f}"
                        summary_results.append({
                            "Price Importance": p_weight,
                            "Coverage Importance": c_weight,
                            "Total Signed Premium": total_prem,
                            "Average Coverage Score": avg_cov
                        })
                df_summary = pd.DataFrame(summary_results)
                st.dataframe(df_summary, use_container_width=True)
           
            st.markdown("""
            **Interpretation:**  
            - Moving the Price Importance closer to 5 generally lowers the total signed premium but might reduce the coverage score.  
            - Moving the Coverage Importance closer to 5 typically improves the average coverage score but may increase the premium.
            """)
