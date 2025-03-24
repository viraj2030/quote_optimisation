# app.py
import dash
from dash import dcc, html, Input, Output, State
import dash_bootstrap_components as dbc
import pandas as pd
import plotly.express as px

from data import load_data, compute_dynamic_ranges
from optimizer import InsuranceOptimizer
from config import LAYERS

# Load and preprocess data
df_data = load_data()
premium_min, premium_max, coverage_min, coverage_max = compute_dynamic_ranges(df_data)

# Initialize the optimizer with our data
optimizer = InsuranceOptimizer(df_data)

# Use Dash Bootstrap for a modern look
external_stylesheets = [dbc.themes.BOOTSTRAP]

app = dash.Dash(__name__, external_stylesheets=external_stylesheets)
app.title = "Insurance Placement Optimizer"

# Define the application layout
app.layout = dbc.Container([
    dbc.Row([
        dbc.Col(html.H1("Insurance Placement Optimizer", className="text-center my-4"), width=12)
    ]),
    dbc.Tabs([
        dbc.Tab(label="Dashboard", tab_id="dashboard"),
        dbc.Tab(label="Raw Data", tab_id="raw-data")
    ], id="tabs", active_tab="dashboard"),
    html.Div(id="tab-content")
], fluid=True)

# Layout for the Dashboard tab
dashboard_layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            html.Label("Target Maximum Premium ($M)"),
            dcc.Slider(
                id="slider-premium",
                min=premium_min/1e6,
                max=premium_max/1e6,
                step=0.01,
                value=premium_max/1e6,
                marks={
                    round(premium_min/1e6,2): f"${round(premium_min/1e6,2)}M",
                    round(premium_max/1e6,2): f"${round(premium_max/1e6,2)}M"
                }
            ),
            html.Br(),
            html.Label("Target Minimum Coverage Score"),
            dcc.Slider(
                id="slider-coverage",
                min=coverage_min,
                max=coverage_max,
                step=0.01,
                value=coverage_min,
                marks={
                    round(coverage_min,2): f"{round(coverage_min,2)}",
                    round(coverage_max,2): f"{round(coverage_max,2)}"
                }
            ),
            html.Br(),
            html.Label("Premium vs. Coverage Weight (1 = Premium minimization, 0 = Coverage maximization)"),
            dcc.Slider(
                id="slider-weight",
                min=0,
                max=1,
                step=0.01,
                value=0.5,
                marks={0: "Coverage", 1: "Premium"}
            ),
            html.Br(),
            html.Label("Minimum Credit Rating"),
            dcc.Dropdown(
                id="dropdown-credit",
                options=[
                    {"label": "B and above", "value": 1},
                    {"label": "A and above", "value": 2},
                    {"label": "AA and above", "value": 3}
                ],
                value=1,
                clearable=False
            ),
            html.Br(),
            dbc.Checklist(
                options=[{"label": "Diversify Carriers", "value": True}],
                value=[],
                id="check-diversify",
                switch=True
            ),
            html.Br(),
            html.Label("Max Capacity per Carrier per Layer ($M)"),
            dcc.Slider(
                id="slider-diversify",
                min=0.5,
                max=10,
                step=0.5,
                value=2,
                marks={i: f"${i}M" for i in range(1,11)}
            ),
            html.Br(),
            html.Label("Required Carriers (if any)"),
            dcc.Dropdown(
                id="dropdown-required",
                options=[{"label": carrier, "value": carrier} for carrier in sorted(df_data["Carrier"].unique())],
                multi=True
            ),
            html.Br(),
            dbc.Button("Run Optimization", id="btn-run", color="primary")
        ], width=4),
        dbc.Col([
            dcc.Loading(
                id="loading-output",
                type="default",
                children=[
                    html.Div(id="optimization-output", className="my-2"),
                    dcc.Graph(id="graph-mudmap")
                ]
            )
        ], width=8)
    ]),
    html.Hr(),
    dbc.Row([
        dbc.Col([
            html.H5("Optimization Results"),
            html.Div(id="results-table")
        ])
    ])
])

# Layout for the Raw Data tab
raw_data_layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            html.H4("Raw Quotes Data"),
            dcc.Markdown("Below is the raw data used in the optimization:"),
            dbc.Table.from_dataframe(df_data, striped=True, bordered=True, hover=True)
        ])
    ])
])

# Callback to render the appropriate tab content
@app.callback(
    Output("tab-content", "children"),
    Input("tabs", "active_tab")
)
def render_tab_content(active_tab):
    if active_tab == "raw-data":
        return raw_data_layout
    return dashboard_layout

# Callback to run the optimization when the button is clicked
@app.callback(
    [Output("optimization-output", "children"),
     Output("graph-mudmap", "figure"),
     Output("results-table", "children")],
    Input("btn-run", "n_clicks"),
    [
        State("slider-premium", "value"),
        State("slider-coverage", "value"),
        State("slider-weight", "value"),
        State("dropdown-credit", "value"),
        State("check-diversify", "value"),
        State("slider-diversify", "value"),
        State("dropdown-required", "value")
    ]
)
def run_optimization(n_clicks, premium_value, coverage_value, weight, min_credit, diversify_check, max_capacity_value, required_carriers):
    if not n_clicks:
        return "", {}, ""
    
    # Convert premium slider value from millions to dollars
    target_max_premium = premium_value * 1e6
    
    # Build parameters dictionary for the optimizer
    params = {
        "target_max_premium": target_max_premium,
        "target_min_coverage": coverage_value,
        "premium_weight": weight,
        "min_credit": min_credit,
        "diversify": True if diversify_check and True in diversify_check else False,
        "max_capacity_per_carrier": max_capacity_value * 1e6,
        "required_carriers": required_carriers if required_carriers else []
    }
    
    try:
        result_df, status, p_slack, c_slacks = optimizer.optimize(params)
    except Exception as e:
        return f"Optimization failed: {e}", {}, ""
    
    if status != "OPTIMAL":
        message = f"Optimization did not reach an optimal solution. Status: {status}"
    else:
        message = f"Optimization successful! Status: {status}"
    
    # Create a stacked bar chart (“mudmap”) showing allocation by layer and carrier
    df_alloc = result_df[result_df["SignedCapacity"] > 0].copy()
    fig = px.bar(
        df_alloc,
        x="AllocationPercentage", y="Layer",
        color="Carrier",
        orientation="h",
        text=df_alloc["AllocationPercentage"].round(2),
        title="Optimized Allocation (Mudmap)"
    )
    fig.update_layout(barmode="stack", xaxis_title="Allocation Percentage", yaxis_title="Layer")
    
    # Create a results table from selected columns
    result_table = dbc.Table.from_dataframe(
        result_df[["Carrier", "Layer", "SignedCapacity", "SignedPremium", "AllocationPercentage"]],
        striped=True, bordered=True, hover=True
    )
    
    return message, fig, result_table

if __name__ == '__main__':
    app.run_server(debug=True)
