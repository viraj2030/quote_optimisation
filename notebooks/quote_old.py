import streamlit as st
import pandas as pd
import numpy as np
import pulp
import plotly.express as px
import os

st.set_page_config(page_title="Insurance Placement Optimizer", layout="wide")

# -----------------------------------------------------------------------------
# Custom CSS for aesthetics: white background, enhanced fonts and spacing
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
# Ensure Homebrew's bin is in the PATH (so that CBC can be found)
# -----------------------------------------------------------------------------
os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ.get("PATH", "")

# -----------------------------------------------------------------------------
# Page Title and Configuration
# -----------------------------------------------------------------------------

st.title("Insurance Placement Optimizer")

# -----------------------------------------------------------------------------
# Step 1: Generate Synthetic Quote Data with Credit Ratings
# -----------------------------------------------------------------------------
# Define layers and their required capacities (in millions)
layers = ["Primary 10M", "10M xs 10M", "10M xs 20M"]
layer_limits = [10, 10, 10]  # For each layer, exactly 10M must be allocated

# Define carriers
carriers = [
    "AIG", "Allianz", "AXA", "Zurich", "Chubb",
    "Liberty", "Berkshire", "Travelers", "Munich Re", "Swiss Re"
]

# Define possible S&P ratings and assign a numeric value for comparison.
possible_ratings = ["B", "A", "AA"]
credit_mapping = {"B": 1, "A": 2, "AA": 3}
# (For example: "B and above" means any rating with value >= 1,
#  "A and above" means rating >= 2, and "AA and above" means rating >= 3.)

np.random.seed(42)  # reproducibility
data = []
for carrier in carriers:
    rating = np.random.choice(possible_ratings, p=[0.3, 0.4, 0.3])
    for layer in layers:
        premium = np.random.randint(800000, 2000001)  # dollars
        capacity = np.random.randint(2, 10)           # in millions
        coverage = np.random.uniform(0.7, 1.0)          # quality score
        data.append({
            "Carrier": carrier,
            "Layer": layer,
            "Premium": premium,
            "Capacity": capacity,
            "Coverage_Score": coverage,
            "Preferred": np.random.choice([0, 1], p=[0.8, 0.2]),
            "CreditRating": rating,
            "CreditRatingValue": credit_mapping[rating]
        })

df_quotes = pd.DataFrame(data)

# -----------------------------------------------------------------------------
# Display Raw Totals (the â€œ100%â€ quotes)
# -----------------------------------------------------------------------------
total_raw_premium = df_quotes["Premium"].sum()
total_raw_capacity = df_quotes["Capacity"].sum()
st.markdown(f"<b>Raw Total Premium (all quotes):</b> ${total_raw_premium:,}", unsafe_allow_html=True)
st.markdown(f"<b>Raw Total Capacity (all quotes):</b> {total_raw_capacity} million", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Step 2: Define the Continuous Optimization Function
# -----------------------------------------------------------------------------
def run_optimization_continuous(w_premium, w_coverage, required_carriers, min_credit, model_type="user"):
    """
    Solve an LP where each quote gets an allocation fraction (0â€“1) such that:
      - SignedCapacity = Fraction * Capacity
      - SignedPremium = Fraction * Premium
    Each layer must be filled exactly.
    For required carriers (in user mode), force a minimal allocation.
    Also, if a quote's CreditRatingValue is below min_credit, force allocation to 0.
   
    The objective is:
         Minimize [w_premium*(Premium/scale) - w_coverage*(Coverage_Score*Capacity)]
    (Lower premium and higher coverage are desired.)
    """
    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    scale = 1e6  # scale premium to millions

    # Build objective
    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = (w_premium * (row["Premium"] / scale) - w_coverage * (row["Coverage_Score"] * row["Capacity"]))
        objective_terms.append(term * x_vars[i])
    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"
   
    # For each layer, allocated capacity must equal the layer limit.
    for idx, layer in enumerate(layers):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                 == layer_limits[idx]), f"Layer_{layer}_Capacity"
   
    # For required carriers, enforce a minimal allocation.
    if model_type == "user":
        for carrier in required_carriers:
            indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
            prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                     >= 0.001), f"Required_{carrier}"
   
    # Enforce credit rating threshold: if CreditRatingValue < min_credit, set allocation = 0.
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
   
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
        # Compute allocation percentage relative to layer limit.
        layer_idx = layers.index(row["Layer"])
        row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limits[layer_idx]) * 100
        results.append(row)
    df_result = pd.DataFrame(results)
    return df_result, pulp.LpStatus[prob.status]

# -----------------------------------------------------------------------------
# Step 3: Create a Function for the Mudmap Visualization
# -----------------------------------------------------------------------------
def plot_mudmap(df_solution):
    """
    Create a horizontal stacked bar chart showing, for each layer, the allocation percentage per carrier.
    """
    df_plot = df_solution.copy()
    df_plot["AllocationPercentage"] = df_plot["AllocationPercentage"].clip(lower=0)
    df_plot["LayerOrder"] = df_plot["Layer"].apply(lambda x: layers.index(x))
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
# Step 4: Build the Streamlit App Interface with Tabs and Explanations
# -----------------------------------------------------------------------------
# Three tabs: Raw Data, User Preference Optimization, Baseline Model Optimization.
tab1, tab2, tab3 = st.tabs(["Raw Quote Mudmap", "User Preference Optimization", "Baseline Model Optimization"])

# ----- TAB 1: Raw Quote Mudmap -----
with tab1:
    st.header("Raw Quote Mudmap (Quotes Received)")
    st.dataframe(df_quotes.sort_values(["Layer", "Carrier"]).reset_index(drop=True))
    st.markdown("---")
    st.subheader("Visual Mudmap (Raw Data)")
    capacity_by_layer = df_quotes.groupby("Layer")["Capacity"].sum().reset_index()
    fig_raw = px.bar(capacity_by_layer, x="Capacity", y="Layer", orientation="h", title="Raw Capacity by Layer")
    st.plotly_chart(fig_raw, use_container_width=True)

# ----- TAB 2: User Preference Optimization -----
with tab2:
    st.header("User Preference Optimization")
    st.markdown("<b>Parameter Explanation:</b>", unsafe_allow_html=True)
    with st.expander("What do the parameters mean?"):
        st.markdown("""
        - **Price Importance (Premium Weight):**  
          A higher value (closer to 5) means you prioritize cost savings, so the optimizer will favor lowerâ€premium quotes.  
          For example, if set to 5, the optimizer seeks the cheapest options even if coverage quality is slightly lower.
        - **Coverage Importance (Coverage Weight):**  
          A higher value (closer to 5) means you want the best coverage quality, even if that means a higher premium.  
          For example, if set to 5, the optimizer favors quotes with higher coverage scores, potentially increasing your premium.
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
   
    # Multiselect for required carriers
    carrier_layers = df_quotes.groupby("Carrier")["Layer"].unique().to_dict()
    carrier_options = [f"{carrier} (quoted: {', '.join(layers_list)})" for carrier, layers_list in carrier_layers.items()]
    display_to_carrier = {f"{carrier} (quoted: {', '.join(layers_list)})": carrier for carrier, layers_list in carrier_layers.items()}
    required_display = st.multiselect("Select Required Carriers (must be present)", options=carrier_options)
    required_carriers = [display_to_carrier[opt] for opt in required_display]
   
    if st.button("Generate Optimization (User Preference)"):
        with st.spinner("Optimizing placement based on your preferences..."):
            df_optimized, status = run_optimization_continuous(
                premium_weight, coverage_weight, required_carriers, credit_threshold, model_type="user"
            )
        if df_optimized is None:
            st.error("No feasible solution was found with these preferences. Please adjust your settings.")
        else:
            st.success("Optimization complete!")
            st.subheader("Optimized (Signed) Placement Mudmap")
            st.dataframe(df_optimized.sort_values(["Layer", "Carrier"]).reset_index(drop=True))
            total_signed_premium = df_optimized["SignedPremium"].sum()
            total_signed_capacity = df_optimized.groupby("Layer")["SignedCapacity"].sum().sum()
            st.markdown(f"<h3>Total Signed Premium: ${total_signed_premium:,.0f}</h3>", unsafe_allow_html=True)
            st.markdown(f"<h3>Total Signed Capacity: {total_signed_capacity:.1f} million</h3>", unsafe_allow_html=True)
            fig_mudmap = plot_mudmap(df_optimized)
            st.plotly_chart(fig_mudmap, use_container_width=True)
           
            # --- Trade-off Comparisons ---
            st.markdown("<b>Trade-off Comparison:</b>", unsafe_allow_html=True)
            with st.spinner("Generating trade-off comparisons..."):
                # Optimize for cheapest premium only (Price=5, Coverage=1)
                df_cheapest, _ = run_optimization_continuous(5, 1, required_carriers, credit_threshold, model_type="user")
                # Optimize for best coverage only (Price=1, Coverage=5)
                df_best_cov, _ = run_optimization_continuous(1, 5, required_carriers, credit_threshold, model_type="user")
                if (df_cheapest is not None) and (df_best_cov is not None):
                    cheapest_premium = df_cheapest["SignedPremium"].sum()
                    best_cov_avg = (df_best_cov["Coverage_Score"] * df_best_cov["SignedCapacity"]).sum() / \
                        df_best_cov["SignedCapacity"].sum()
                    current_avg_cov = (df_optimized["Coverage_Score"] * df_optimized["SignedCapacity"]).sum() / \
                        df_optimized["SignedCapacity"].sum()
                    colA, colB = st.columns(2)
                    with colA:
                        st.markdown(f"**Cheapest Premium Option:** Total Signed Premium = ${cheapest_premium:,.0f}")
                    with colB:
                        st.markdown(f"**Best Coverage Option:** Average Coverage Score = {best_cov_avg:.2f}")
                    st.markdown(f"**Your Option:** Total Signed Premium = ${total_signed_premium:,.0f}, Average Coverage Score = {current_avg_cov:.2f}")
                    st.markdown("""
                    **Interpretation:**  
                    - If you move your Price Importance closer to 5, you will likely lower the total signed premium (i.e. get a cheaper deal) at the potential expense of coverage quality.  
                    - If you move your Coverage Importance closer to 5, you will likely improve the average coverage score but may incur a higher premium.
                    """)
           
# ----- TAB 3: Baseline Model Optimization -----
with tab3:
    st.header("Baseline Model Optimization")
    st.markdown("<b>This model uses fixed weights (Price=5, Coverage=5) without required carriers.</b>", unsafe_allow_html=True)
    st.markdown("""
    **Explanation:**  
    The baseline option represents the overall best compromise between cost and coverage quality.  
    It serves as a reference point to compare against your custom preferences.
    """)
    if st.button("Generate Baseline Optimization"):
        with st.spinner("Optimizing baseline placement..."):
            df_baseline, status = run_optimization_continuous(5, 5, required_carriers=[], min_credit=1, model_type="baseline")
        if df_baseline is None:
            st.error("No feasible solution was found for the baseline model.")
        else:
            st.success("Baseline optimization complete!")
            st.subheader("Baseline Optimized (Signed) Placement Mudmap")
            st.dataframe(df_baseline.sort_values(["Layer", "Carrier"]).reset_index(drop=True))
            total_base_premium = df_baseline["SignedPremium"].sum()
            st.markdown(f"<h3>Total Signed Premium (Baseline): ${total_base_premium:,.0f}</h3>", unsafe_allow_html=True)
            fig_base = plot_mudmap(df_baseline)
            st.plotly_chart(fig_base, use_container_width=True)
            st.markdown("""
            **Interpretation:**  
            The baseline optimization seeks the best overall placement considering both cost and coverage quality.  
            Compare this with your custom option to see how much premium savings or coverage differences result from your chosen parameters.
            """)