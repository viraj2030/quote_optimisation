# optimizer.py
import pandas as pd
from ortools.linear_solver import pywraplp
from config import LAYERS, PENALTY_PREMIUM, PENALTY_COVERAGE

def get_status_name(status, solver):
    """
    Helper function to convert the solver status code to a string.
    """
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

class InsuranceOptimizer:
    def __init__(self, df):
        self.df = df.reset_index(drop=True)
        self.num_quotes = len(self.df)
        # Pre-calculate indices for each layer to speed up constraint creation
        self.layer_indices = {}
        for layer in [layer["name"] for layer in LAYERS]:
            self.layer_indices[layer] = self.df.index[self.df["Layer"] == layer].tolist()
    
    def optimize(self, params):
        """
        Run the optimization given a dictionary of parameters.
        Expected keys in params:
          - target_max_premium: float (in dollars)
          - target_min_coverage: float (coverage score target as a fraction of capacity)
          - premium_weight: float (0 to 1, where 1 means pure premium minimization)
          - required_carriers: list of carrier names (each required to receive at least a minimal allocation)
          - min_credit: int (minimum acceptable CreditRatingValue)
          - diversify: bool (if True, limit allocation per carrier per layer)
          - max_capacity_per_carrier: float (in dollars)
        """
        solver = pywraplp.Solver.CreateSolver('CBC')
        if not solver:
            raise Exception("Solver not available.")
        
        # Decision variables: fraction allocated for each quote (continuous between 0 and 1)
        x = [solver.NumVar(0, 1, f'x_{i}') for i in range(self.num_quotes)]
        
        # Slack variables for premium and for each layer’s coverage
        p_slack = solver.NumVar(0, solver.infinity(), "p_slack")
        c_slacks = {layer["name"]: solver.NumVar(0, solver.infinity(), f'c_slack_{layer["name"]}') for layer in LAYERS}
        
        # Total premium and total coverage expressions
        total_premium = solver.Sum([self.df.loc[i, "Premium"] * x[i] for i in range(self.num_quotes)])
        total_coverage = solver.Sum([self.df.loc[i, "Coverage_Score"] * self.df.loc[i, "Capacity"] * x[i] for i in range(self.num_quotes)])
        
        # Normalization factors (using overall sums)
        baseline_premium = sum(self.df["Premium"])
        baseline_coverage = sum(self.df["Coverage_Score"] * self.df["Capacity"])
        
        # Objective: minimize weighted normalized premium minus normalized coverage plus penalties for slack
        premium_weight = params.get("premium_weight", 1.0)
        objective = (
            premium_weight * (total_premium / baseline_premium)
            - (1 - premium_weight) * (total_coverage / baseline_coverage)
            + PENALTY_PREMIUM * p_slack
            + PENALTY_COVERAGE * solver.Sum([c_slacks[layer["name"]] for layer in LAYERS])
        )
        solver.Minimize(objective)
        
        # Per‑layer constraints: enforce capacity and a minimum coverage level
        for layer_dict in LAYERS:
            layer_name = layer_dict["name"]
            capacity_limit = layer_dict["limit"]
            indices = self.layer_indices[layer_name]
            # Total signed capacity for the layer must equal its limit
            solver.Add(solver.Sum([self.df.loc[i, "Capacity"] * x[i] for i in indices]) == capacity_limit)
            # Coverage constraint: weighted coverage must be at least (target_min_coverage * capacity) minus slack
            solver.Add(
                solver.Sum([self.df.loc[i, "Coverage_Score"] * self.df.loc[i, "Capacity"] * x[i] for i in indices])
                >= params["target_min_coverage"] * capacity_limit - c_slacks[layer_name]
            )
        
        # Overall premium constraint: total premium must not exceed target_max_premium plus slack
        solver.Add(total_premium <= params["target_max_premium"] + p_slack)
        
        # Required carriers: each must receive at least a minimal allocation (here, 0.1% of 1e6)
        for carrier in params.get("required_carriers", []):
            indices = self.df.index[self.df["Carrier"] == carrier].tolist()
            if indices:
                solver.Add(solver.Sum([self.df.loc[i, "Capacity"] * x[i] for i in indices]) >= 0.001 * 1e6)
        
        # Credit rating constraint: if a quote’s CreditRatingValue is below min_credit, no allocation allowed
        min_credit = params.get("min_credit", 1)
        for i in range(self.num_quotes):
            if self.df.loc[i, "CreditRatingValue"] < min_credit:
                solver.Add(x[i] == 0)
        
        # Diversification constraint: limit allocation per carrier per layer if required
        if params.get("diversify", False):
            max_cap = params.get("max_capacity_per_carrier", 10e6)
            carriers = self.df["Carrier"].unique()
            for carrier in carriers:
                for layer_dict in LAYERS:
                    layer_name = layer_dict["name"]
                    indices = self.df.index[(self.df["Carrier"] == carrier) & (self.df["Layer"] == layer_name)].tolist()
                    if indices:
                        solver.Add(solver.Sum([self.df.loc[i, "Capacity"] * x[i] for i in indices]) <= max_cap)
        
        # Solve the model
        status = solver.Solve()
        status_str = get_status_name(status, solver)
        
        # Build results: for each quote, compute allocated fraction, signed capacity, signed premium, and allocation percentage by layer
        results = []
        for i in range(self.num_quotes):
            fraction = x[i].solution_value() if x[i].solution_value() is not None else 0
            if fraction < 1e-6:
                fraction = 0
            row = self.df.loc[i].copy()
            row["FractionAllocated"] = fraction
            row["SignedCapacity"] = row["Capacity"] * fraction
            row["SignedPremium"] = row["Premium"] * fraction
            # Compute allocation percentage (relative to the layer’s limit)
            layer_name = row["Layer"]
            layer_limit = next(item["limit"] for item in LAYERS if item["name"] == layer_name)
            row["AllocationPercentage"] = (row["SignedCapacity"] / layer_limit) * 100
            results.append(row)
        
        result_df = pd.DataFrame(results)
        premium_slack_val = p_slack.solution_value()
        coverage_slacks = {layer: c_slacks[layer].solution_value() for layer in c_slacks}
        
        return result_df, status_str, premium_slack_val, coverage_slacks
