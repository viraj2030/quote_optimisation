import streamlit as st
import pandas as pd
import numpy as np
import pulp
import plotly.express as px
import os
 
# -----------------------------------------------------------------------------
# Ensure Homebrew's bin is in the PATH so CBC can be found on macOS (macOS only)
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
The optimiser helps clients to find the optimum balance between price, coverage and security
""")
 
# -----------------------------------------------------------------------------
# Synthetic Quote Data
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
 
# Update credit ratings so each carrier is assigned its highest rating found
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
# Show Collapsible Raw Data
# -----------------------------------------------------------------------------
with st.expander("Raw Quote Data & Totals"):
    st.markdown("**Raw Totals**")
    total_raw_premium = df_quotes["Premium"].sum()
    total_raw_capacity = df_quotes["Capacity"].sum()
    st.write(f"- Raw Total Premium (all quotes): **${total_raw_premium:,.0f}**")
    st.write(f"- Raw Total Capacity (all quotes): **{total_raw_capacity:.2f} million**")
 
    # Display the entire quotes table (hide 'Preferred' and 'CreditRatingValue', and rename columns)
    st.markdown("**Raw Quotes**")
    df_raw_display = df_quotes.drop(columns=["Preferred", "CreditRatingValue"]).copy()
    df_raw_display = df_raw_display.rename(columns={
        "Capacity": "Offered Capacity",
        "Premium": "Written Premium",
        "Coverage_Score": "Coverage Score (%)"
    })
    df_raw_display["Coverage Score (%)"] = df_raw_display["Coverage Score (%)"].apply(lambda x: f"{x*100:.0f}%" if pd.notna(x) else x)
    st.dataframe(df_raw_display, use_container_width=True)
 
# -----------------------------------------------------------------------------
# Helper: Optimization Function
# -----------------------------------------------------------------------------
def run_optimization_continuous(
    w_premium, w_coverage, required_carriers, min_credit,
    diversify, max_capacity_abs, min_capacity_abs=None
):
    """
    Runs the continuous optimization model with the specified parameters.
    Returns (df_solution, status) or (None, status) if infeasible.
    """
    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts("x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous")
    scale = 1e5
 
    # Objective
    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = (w_premium * (row["Premium"] / scale) - w_coverage * (row["Coverage_Score"] * row["Capacity"]))
        objective_terms.append(term * x_vars[i])
    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"
   
    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                 == layer_limits[idx]), f"Layer_{layer}_Capacity"
   
    for carrier in required_carriers:
        indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()
        prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                 >= 0.001), f"Required_{carrier}"
   
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"
   
    if diversify and (max_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                         <= max_capacity_abs), f"Max_Capacity_{carrier}_{layer}"
    if diversify and (min_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[(df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)].tolist()
                available_capacity = sum(df_quotes.loc[i, "Capacity"] for i in indices)
                if available_capacity >= min_capacity_abs:
                    prob += (pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
                             >= min_capacity_abs), f"Min_Capacity_{carrier}_{layer}"
   
    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)
   
    if pulp.LpStatus[prob.status] != "Optimal":
        return None, pulp.LpStatus[prob.status]
   
    results = []
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    for i in range(num_quotes):
        fraction = pulp.value(x_vars[i])
        if fraction is None or fraction < 1e-6:
            fraction = 0
        row = df_quotes.iloc[i].copy()
        row["FractionAllocated"] = fraction
        row["SignedCapacity"] = row["Capacity"] * fraction
        row["SignedPremium"] = row["Premium"] * fraction
        row["AllocationPercentage"] = 0
        if fraction > 0:
            row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limits[layer_order[row["Layer"]]]) * 100
        results.append(row)
    df_result = pd.DataFrame(results)
    return df_result, pulp.LpStatus[prob.status]
 
# -----------------------------------------------------------------------------
# Helper: Plot Mudmap
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
    fig.update_layout(
        barmode="stack",
        xaxis_title="Capacity Allocated (% of 100)",
        yaxis_title="Layer"
    )
    return fig
 
# -----------------------------------------------------------------------------
# New Helper: Plot Security Mudmap
# -----------------------------------------------------------------------------
def plot_security_mudmap(df_solution):
    """
    Creates a stacked bar chart with rating-based colors:
      B => Yellow
      A => Light Green
      AA => Green
 
    Each stacked bar segment has a thin black border.
    The tooltip includes the Carrier name, rating, and capacity%.
    """
    df_plot = df_solution.copy()
    df_plot["AllocationPercentage"] = df_plot["AllocationPercentage"].clip(lower=0)
    layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
    df_plot["LayerOrder"] = df_plot["Layer"].apply(lambda x: layer_order[x])
    df_plot = df_plot.sort_values(["LayerOrder", "Carrier"])
   
    # Map each rating to the requested color
    rating_colors = {
        "B": "#ffd966",    # Yellow
        "A": "#b6d7a8",    # Light Green
        "AA": "#6aa84f"    # Green
    }
   
    fig_sec = px.bar(
        df_plot,
        x="AllocationPercentage",
        y="Layer",
        color="CreditRating",
        orientation="h",
        title="Security View: Credit Ratings by Layer",
        category_orders={"CreditRating": ["AA", "A", "B"]},
        hover_data=["Carrier", "CreditRating", "AllocationPercentage"],
        color_discrete_map=rating_colors
    )
    fig_sec.update_layout(
        barmode="stack",
        xaxis_title="Capacity Allocated (% of 100)",
        yaxis_title="Layer",
        legend_title="Credit Rating"
    )
    # Thin black border around each segment
    fig_sec.update_traces(marker_line_width=0.5, marker_line_color="white")
   
    fig_sec.update_traces(
        text=df_plot["AllocationPercentage"].apply(lambda x: f"{x:.1f}%")
    )
    fig_sec.update_layout(coloraxis_showscale=False)
   
    return fig_sec
 
# -----------------------------------------------------------------------------
# Helper: Compute Pareto Frontier
# -----------------------------------------------------------------------------
def compute_pareto_frontier(df_solutions):
    df_filtered = df_solutions[df_solutions["Total Signed Premium"] != "No Solution"].copy()
    df_filtered["PremiumFloat"] = df_filtered["Total Signed Premium"].apply(
        lambda x: float(x.replace("$","").replace(",","")) if isinstance(x, str) else x
    )
    df_filtered["CoverageFloat"] = df_filtered["Average Coverage Score"].astype(float)
   
    pareto_set = []
    all_solutions = df_filtered.to_dict("records")
   
    for sol in all_solutions:
        p_imp = sol["Price Importance"]
        c_imp = sol["Coverage Importance"]
        prem = sol["PremiumFloat"]
        cov = sol["CoverageFloat"]
        dominated = False
        for other in all_solutions:
            if other is sol:
                continue
            other_prem = other["PremiumFloat"]
            other_cov = other["CoverageFloat"]
            if (other_prem <= prem) and (other_cov >= cov) and ((other_prem < prem) or (other_cov > cov)):
                dominated = True
                break
        if not dominated:
            pareto_set.append((p_imp, c_imp))
   
    return pareto_set
 
# -----------------------------------------------------------------------------
# Session State to store optimization results
# -----------------------------------------------------------------------------
if "df_user_solution" not in st.session_state:
    st.session_state["df_user_solution"] = None
if "user_params" not in st.session_state:
    st.session_state["user_params"] = None
 
# -----------------------------------------------------------------------------
# STEP 1: User Preferences in the Sidebar
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### Step 1: Configure Your Preferences")
    
    # Hide the Price and Coverage sliders in a sub-section
    with st.expander("Price and Coverage Preferences", expanded=False):
        premium_weight = st.slider(
            "Price Importance (1 = Least Importance, 10 = Most Importance)",
            min_value=1, max_value=10, value=5, step=1
        )
        coverage_weight = st.slider(
            "Coverage Importance (1 = Least Importance, 10 = Most Importance)",
            min_value=1, max_value=10, value=5, step=1
        )
    
    min_credit_str = st.selectbox(
        "Credit Rating",
        options=["B and above", "A and above", "AA and above"],
        index=1
    )
    credit_threshold = {"B and above": 1, "A and above": 2, "AA and above": 3}[min_credit_str]
   
    # Required carriers
    carrier_layers = df_quotes.groupby("Carrier")["Layer"].unique().to_dict()
    carrier_options = [f"{carrier} (quoted: {', '.join(layers_list)})" for carrier, layers_list in carrier_layers.items()]
    display_to_carrier = {f"{carrier} (quoted: {', '.join(layers_list)})": carrier for carrier, layers_list in carrier_layers.items()}
    required_display = st.multiselect("Select Required Carriers", options=carrier_options)
    required_carriers = [display_to_carrier[opt] for opt in required_display]
   
    # Diversification: Use absolute limits in $M if checked.
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
   
    if st.button("Run Optimization"):
        st.session_state["user_params"] = {
            "premium_weight": premium_weight,
            "coverage_weight": coverage_weight,
            "credit_threshold": credit_threshold,
            "required_carriers": required_carriers,
            "diversify": diversify,
            "max_capacity_abs": max_capacity_abs,
            "min_capacity_abs": min_capacity_abs
        }
        with st.spinner("Optimizing placement..."):
            df_opt, status = run_optimization_continuous(
                premium_weight, coverage_weight, required_carriers,
                credit_threshold, diversify, max_capacity_abs, min_capacity_abs
            )
        if df_opt is None:
            st.error(f"No feasible solution. Solver status: {status}")
            st.session_state["df_user_solution"] = None
        else:
            st.session_state["df_user_solution"] = df_opt
            st.success("Optimization successful! See Step 2 below.")
 
# -----------------------------------------------------------------------------
# STEP 2: Recommended Placement
# -----------------------------------------------------------------------------
with st.expander("**Step 2: View Your Recommended Placement**", expanded=False):
    if st.session_state["df_user_solution"] is None:
        st.info("No solution yet. Please configure your preferences in Step 1 and run the optimization.")
    else:
        df_opt = st.session_state["df_user_solution"]
        df_alloc = df_opt[df_opt["SignedCapacity"] > 0].copy()
        if df_alloc.empty:
            st.warning("The optimizer allocated zero capacity. Check your constraints.")
        else:
            total_signed_premium = df_alloc["SignedPremium"].sum()
            total_signed_capacity = df_alloc["SignedCapacity"].sum()
            avg_coverage_score = 0.0
            if total_signed_capacity > 0:
                avg_coverage_score = (df_alloc["Coverage_Score"] * df_alloc["SignedCapacity"]).sum() / total_signed_capacity
           
            st.markdown(f"**Total Signed Premium:** ${total_signed_premium:,.0f}")
            st.markdown(f"**Total Signed Capacity:** {total_signed_capacity:.2f} million")
            st.markdown(f"**Average Coverage Score:** {avg_coverage_score*100:.0f}%")
           
            show_cols = ["Carrier","Layer","Capacity","SignedCapacity","Premium","SignedPremium","Coverage_Score"]
            df_alloc_display = df_alloc[show_cols].copy()
            df_alloc_display = df_alloc_display.rename(columns={
                "Capacity": "Offered Capacity",
                "Premium": "Written Premium",
                "SignedCapacity": "Signed Capacity",
                "SignedPremium": "Signed Premium",
                "Coverage_Score": "Coverage Score (%)"
            })
            df_alloc_display["Coverage Score (%)"] = df_alloc_display["Coverage Score (%)"].apply(lambda x: f"{x*100:.0f}%" if pd.notna(x) else x)
           
            # Order by layer using desired order
            layer_order = {"Primary $10M": 0, "$10M xs $10M": 1, "$10M xs $20M": 2}
            df_alloc_display["LayerOrder"] = df_alloc_display["Layer"].map(layer_order)
            df_alloc_display = df_alloc_display.sort_values(["LayerOrder", "Carrier"]).drop(columns=["LayerOrder"]).reset_index(drop=True)
            st.dataframe(df_alloc_display, use_container_width=True)
           
            # Add a toggle for viewing the mudmap as either Capacity or Security.
            view_mode = st.radio("View Mode", options=["Capacity", "Security"], index=0, horizontal=True)
            if view_mode == "Capacity":
                fig_mudmap = plot_mudmap(df_alloc)
            else:
                fig_mudmap = plot_security_mudmap(df_alloc)
            st.plotly_chart(fig_mudmap, use_container_width=True)
 
# -----------------------------------------------------------------------------
# STEP 3: Explore All Price/Coverage Combinations (Advanced Rectangle Heatmap)
# -----------------------------------------------------------------------------
import plotly.graph_objects as go
 
with st.expander("**Step 3: Explore All Price/Coverage Combinations**", expanded=False):
    st.markdown("""
    **Color Codes**:
    - Light Grey = Your Selection
    - Yellow  = (premium=10, coverage=1) and (premium=1, coverage=10)
    - Green = Optimal Selection
    """)
   
    user_params = st.session_state.get("user_params", None)
    if not user_params:
        st.info("Please run an optimization in Step 1 first.")
    else:
        # 1) Generate all 100 combos (Price=1..10, Coverage=1..10)
        combos = []
        for p_imp in range(1, 11):
            for c_imp in range(1, 11):
                df_sol, status_sol = run_optimization_continuous(
                    p_imp, c_imp,
                    user_params["required_carriers"],
                    user_params["credit_threshold"],
                    user_params["diversify"],
                    user_params["max_capacity_abs"],
                    user_params["min_capacity_abs"]
                )
                if (df_sol is None) or (df_sol["SignedCapacity"].sum() == 0):
                    combos.append({
                        "Price Importance": p_imp,
                        "Coverage Importance": c_imp,
                        "Total Signed Premium": float('nan'),
                        "Average Coverage Score": float('nan')
                    })
                else:
                    total_prem = df_sol["SignedPremium"].sum()
                    total_cap = df_sol["SignedCapacity"].sum()
                    avg_cov = float('nan')
                    if total_cap > 0:
                        avg_cov = (df_sol["Coverage_Score"] * df_sol["SignedCapacity"]).sum() / total_cap
                    combos.append({
                        "Price Importance": p_imp,
                        "Coverage Importance": c_imp,
                        "Total Signed Premium": total_prem,
                        "Average Coverage Score": avg_cov
                    })
        df_combos = pd.DataFrame(combos)
 
        # 2) Prepare 10x10 arrays for colors, text, and composite scores
        color_code_array = np.zeros((10,10), dtype=float)  # 0=white, 1=grey, 2=yellow, 3=green
        text_array = np.empty((10,10), dtype=object)
        composite_scores = np.full((10,10), np.nan)
 
        def get_indices(price, coverage):
            return (price - 1, coverage - 1)
 
        # 3) For normalization
        df_feasible = df_combos.dropna(subset=["Total Signed Premium", "Average Coverage Score"])
        max_prem = df_feasible["Total Signed Premium"].max() if not df_feasible.empty else 1
        max_cov = df_feasible["Average Coverage Score"].max() if not df_feasible.empty else 1
 
        # 4) Build text array & compute composite scores
        for _, row in df_combos.iterrows():
            p_val = row["Price Importance"]
            c_val = row["Coverage Importance"]
            if pd.isna(p_val) or pd.isna(c_val):
                continue
            r, c = get_indices(int(p_val), int(c_val))
            if pd.isna(row["Total Signed Premium"]) or pd.isna(row["Average Coverage Score"]):
                text_array[r][c] = "No Sol"
            else:
                prem_str = f"${row['Total Signed Premium']:,.0f}"
                cov_str  = f"{row['Average Coverage Score']*100:.0f}%"
                text_array[r][c] = f"Premium: {prem_str}\n\n\n\nCoverage: {cov_str}"
                comp = (row["Average Coverage Score"] / max_cov) - (row["Total Signed Premium"] / max_prem)
                composite_scores[r, c] = comp
 
        # 5) Set specific highlights:
        # Yellow (2) for (premium=10, coverage=1) => indices (10,1) → row=9, col=0
        # and (premium=1, coverage=10) => indices (1,10) → row=0, col=9
        color_code_array[9, 0] = 2
        color_code_array[0, 9] = 2
 
        # 6) User selection => Grey (1)
        chosen_p = user_params["premium_weight"]
        chosen_c = user_params["coverage_weight"]
        if chosen_p in range(1, 11) and chosen_c in range(1, 11):
            rp, rc = get_indices(chosen_p, chosen_c)
            color_code_array[rp, rc] = 1
 
        # 7) Composite optimum => Green (3)
        if not np.all(np.isnan(composite_scores)):
            max_idx = np.nanargmax(composite_scores)
            opt_r, opt_c = np.unravel_index(max_idx, composite_scores.shape)
            color_code_array[opt_r, opt_c] = 3
 
        # 8) Create advanced heatmap using rectangle shapes with go.Figure
        fig_heat = go.Figure()
        cell_width = 1.0
        cell_height = 1.0
 
        # Rows: Price=1 at the top → map row r to y: y = 10 - r.
        for r in range(10):
            for c in range(10):
                code = color_code_array[r, c]
                color_map = {0: "white", 1: "#eeeeee", 2: "#ffe599", 3: "#b6d7a8"}
                fillcolor = color_map[code]
                x0 = c
                x1 = c + cell_width
                y0 = 10 - r - 1  # so that row 0 appears at the top
                y1 = y0 + cell_height
                fig_heat.add_shape(
                    type="rect",
                    x0=x0, x1=x1,
                    y0=y0, y1=y1,
                    fillcolor=fillcolor,
                    line=dict(color="#EEEEEE", width=0.5)
                )
                cell_text = text_array[r][c] if text_array[r][c] is not None else "No Sol"
                fig_heat.add_annotation(
                    x=x0 + cell_width/2,
                    y=y0 + cell_height/2,
                    text=cell_text,
                    showarrow=False,
                    font=dict(color="black", size=12),
                    align="center",
                    valign="middle"
                )
 
        fig_heat.update_xaxes(
            range=[0, 10],
            tickmode="array",
            tickvals=[i + 0.5 for i in range(10)],
            ticktext=[str(i+1) for i in range(10)],
            side="top",
            showgrid=False,
            zeroline=False
        )
        fig_heat.update_yaxes(
            range=[0, 10],
            tickmode="array",
            tickvals=[i + 0.5 for i in range(10)],
            ticktext=[str(i+1) for i in range(10)][::-1],
            showgrid=False,
            zeroline=False
        )
        fig_heat.update_layout(
            width=600,
            height=600,
            margin=dict(l=40, r=40, t=80, b=40),
            title="Trade-off Grid: Premium & Coverage",
            xaxis_title="Coverage Importance",
            yaxis_title="Price Importance"
        )
 
        st.plotly_chart(fig_heat, use_container_width=True)
 
        # 9) --- Trade-off Charts ---
        st.markdown("### Trade-off Charts")
       
        col1, col2, col3 = st.columns(3)
 
        # Chart 1: Average Premium by Price Importance (smooth line)
        premium_by_price = df_combos.groupby("Price Importance")["Total Signed Premium"].mean().reset_index()
        fig_line1 = px.line(
            premium_by_price,
            x="Price Importance",
            y="Total Signed Premium",
            line_shape="spline",
            title="Average Premium by Price Importance"
        )
        with col1:
            st.plotly_chart(fig_line1, use_container_width=True)
            st.markdown("""
                Shows how the overall cost changes when you emphasize price more.
                """)
 
        # Chart 2: Average Coverage by Coverage Importance (smooth line)
        coverage_by_coverage = df_combos.groupby("Coverage Importance")["Average Coverage Score"].mean().reset_index()
        coverage_by_coverage["Average Coverage Score"] = coverage_by_coverage["Average Coverage Score"] * 100
        fig_line2 = px.line(
            coverage_by_coverage,
            x="Coverage Importance",
            y="Average Coverage Score",
            line_shape="spline",
            title="Average Coverage by Coverage Importance (%)"
        )
        with col2:
            st.plotly_chart(fig_line2, use_container_width=True)
            st.markdown("""
                        Displays how coverage quality improves as you prioritize it.
                        """)
 
        # Chart 3: Scatter Plot of all 100 combos (x: Premium, y: Coverage)
        df_scatter = df_combos.dropna(subset=["Total Signed Premium", "Average Coverage Score"]).copy()
        df_scatter["Average Coverage Score"] = df_scatter["Average Coverage Score"] * 100
        fig_scatter = px.scatter(
            df_scatter,
            x="Total Signed Premium",
            y="Average Coverage Score",
            title="Scatter Plot: Premium vs Coverage (%)"
        )
        fig_scatter.update_traces(mode="markers")
        with col3:
            st.plotly_chart(fig_scatter, use_container_width=True)
            st.markdown("""
                        Plots all combinations, showing the trend between cost and quality.
                        """)
 
# -----------------------------------------------------------------------------
# STEP 4: Comparison of User Selected vs. Pareto Optimal Placements
# -----------------------------------------------------------------------------
with st.expander("**Step 4: Comparison of User Selected vs. Pareto Optimal Placements**", expanded=False):
    # Check if a user-selected solution is available
    if st.session_state["df_user_solution"] is None:
        st.info("No user-selected solution available. Please run Step 1 and Step 2.")
    else:
        # Get the user-selected solution and filter out zero allocations
        df_user = st.session_state["df_user_solution"]
        df_user_alloc = df_user[df_user["SignedCapacity"] > 0].copy()
       
        # Compute totals for the user-selected solution
        user_total_premium = df_user_alloc["SignedPremium"].sum()
        user_total_capacity = df_user_alloc["SignedCapacity"].sum()
        user_avg_cov = 0
        if user_total_capacity > 0:
            user_avg_cov = (df_user_alloc["Coverage_Score"] * df_user_alloc["SignedCapacity"]).sum() / user_total_capacity
       
        # Compute the Pareto optimal solution (agnostic to filters) using balanced weights.
        # (w_premium=1, w_coverage=1, required_carriers=[], min_credit=1, diversify=False)
        df_pareto, pareto_status = run_optimization_continuous(1, 1, [], 1, False, None, None)
        if df_pareto is None:
            st.error(f"No Pareto optimal solution found. Solver status: {pareto_status}")
        else:
            df_pareto_alloc = df_pareto[df_pareto["SignedCapacity"] > 0].copy()
            pareto_total_premium = df_pareto_alloc["SignedPremium"].sum()
            pareto_total_capacity = df_pareto_alloc["SignedCapacity"].sum()
            pareto_avg_cov = 0
            if pareto_total_capacity > 0:
                pareto_avg_cov = (df_pareto_alloc["Coverage_Score"] * df_pareto_alloc["SignedCapacity"]).sum() / pareto_total_capacity
       
            # Compute differences
            premium_diff = user_total_premium - pareto_total_premium
            coverage_diff = (user_avg_cov - pareto_avg_cov) * 100  # in percentage
       
            # Determine text colors (only for the numeric values):
            # For Premium: light pink if positive (user premium is higher), light green if negative.
            if premium_diff > 0:
                premium_text_color = "#e06666"  # light pink
            else:
                premium_text_color = "#8fce00"  # light green
               
            # For Coverage: light green if positive (user coverage is higher), light pink if negative.
            if coverage_diff > 0:
                coverage_text_color = "#8fce00"  # light green
            else:
                coverage_text_color = "#e06666"  # light pink
       
            # Display overall totals and differences as text (without colored backgrounds)
            st.markdown("### Overall Placement Comparison")
            st.markdown(f"**Differences:**<br>Premium Difference = **<span style='color: {premium_text_color};'>${premium_diff:,.0f}</span>**<br>Coverage Difference = **<span style='color: {coverage_text_color};'>{coverage_diff:.0f}%</span>**", unsafe_allow_html=True)
       
            # Toggle for view mode: Capacity vs. Security
            comp_view_mode = st.radio("Comparison View Mode", options=["Capacity", "Security"], index=0, horizontal=True)
       
            # Create two columns for side-by-side mudmaps
            col_left, col_right = st.columns(2)
            with col_left:
                st.markdown("**User Selected Placement**")
                if comp_view_mode == "Capacity":
                    fig_user = plot_mudmap(df_user_alloc)
                else:
                    fig_user = plot_security_mudmap(df_user_alloc)
                st.plotly_chart(fig_user, use_container_width=True, key="user_mudmap")
                st.markdown(f"**Total Signed Premium:** ${user_total_premium:,.0f}  \n**Average Coverage Score:** {user_avg_cov*100:.0f}%")
            with col_right:
                st.markdown("**Pareto Optimal Placement (Agnostic)**")
                if comp_view_mode == "Capacity":
                    fig_pareto = plot_mudmap(df_pareto_alloc)
                else:
                    fig_pareto = plot_security_mudmap(df_pareto_alloc)
                st.plotly_chart(fig_pareto, use_container_width=True, key="pareto_mudmap")
                st.markdown(f"**Total Signed Premium:** ${pareto_total_premium:,.0f}  \n**Average Coverage Score:** {pareto_avg_cov*100:.0f}%")
