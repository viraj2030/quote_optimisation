import pandas as pd
import numpy as np
import pulp
import os  # For path operations


def get_quote_data():
    """Return the synthetic quote data"""
    layer_limits = [10, 10, 10]

    data = {
        "Carrier": [
            "AIG",
            "Allianz",
            "AXA",
            "Zurich",
            "Chubb",
            "Liberty",
            "Berkshire Hathaway Inc.",
            "Travelers",
            "Munich Re",
            "Swiss Re",
            "Hannover Re",
            "SCOR",
            "Partner Re",
            "Renaissance Re",
            "Arch Capital",
            "Axis Capital",
            "AIG",
            "Endurance",
            "Aspen Re",
            "Validus",
            "Chubb",
            "Catlin",
            "Allied World",
            "Hiscox",
            "Amlin",
            "Beazley",
            "AXA",
            "Brit",
            "MS Amlin",
            "XL Catlin",
        ],
        "Layer": [
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "Primary $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $10M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
            "$10M xs $20M",
        ],
        "Premium": [
            156690,
            127020,
            133680,
            139980,
            135870,
            118710,
            164370,
            142350,
            135900,
            127620,
            27540,
            26310,
            25680,
            33690,
            24330,
            27570,
            28650,
            21690,
            20190,
            19110,
            19050,
            20040,
            20940,
            21510,
            17370,
            19920,
            18180,
            23820,
            19920,
            23250,
        ],
        "Capacity": [
            2.66,
            4.20,
            3.11,
            5.56,
            3.98,
            2.66,
            1.98,
            2.04,
            2.56,
            2.78,
            2.92,
            5.01,
            2.63,
            2.56,
            3.04,
            2.44,
            3.03,
            3.55,
            3.33,
            3.67,
            4.01,
            3.22,
            2.98,
            2.66,
            2.44,
            3.03,
            2.88,
            3.67,
            4.94,
            7,
        ],
        "Coverage_Score": [
            0.97,
            0.63,
            0.80,
            0.81,
            0.83,
            0.72,
            0.92,
            0.81,
            0.76,
            0.77,
            0.78,
            0.73,
            0.75,
            0.97,
            0.76,
            0.89,
            0.81,
            0.72,
            0.68,
            0.66,
            0.91,
            0.73,
            0.77,
            0.80,
            0.77,
            0.87,
            0.86,
            0.81,
            0.77,
            0.82,
        ],
        "Preferred": [
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            1,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            1,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
        ],
        "CreditRating": [
            "A+",
            "AA",
            "AA-",
            "AA",
            "AA",
            "A",
            "AA",
            "AA",
            "AA",
            "AAA",
            "A+",
            "A-",
            "A-",
            "A-",
            "A",
            "A",
            "A+",
            "A-",
            "A-",
            "B+",
            "AA",
            "A-",
            "A-",
            "A-",
            "A-",
            "A-",
            "AA-",
            "A-",
            "A-",
            "A-",
        ],
        "CreditRatingValue": [
            4,
            6,
            5,
            6,
            6,
            3,
            6,
            6,
            6,
            8,
            4,
            2,
            2,
            2,
            3,
            3,
            4,
            2,
            2,
            1,
            6,
            2,
            2,
            2,
            2,
            2,
            5,
            2,
            2,
            2,
        ],
    }
    df_quotes = pd.DataFrame(data)

    # Update Credit Ratings
    highest_ratings = df_quotes.groupby("Carrier")["CreditRatingValue"].max().to_dict()
    rev_credit_mapping = {
        1: "B+",
        2: "A-",
        3: "A",
        4: "A+",
        5: "AA-",
        6: "AA",
        7: "AA+",
        8: "AAA",
    }

    def update_rating(row):
        carrier = row["Carrier"]
        highest = highest_ratings[carrier]
        row["CreditRatingValue"] = highest
        row["CreditRating"] = rev_credit_mapping[highest]
        return row

    df_quotes = df_quotes.apply(update_rating, axis=1)
    return df_quotes


def check_feasibility(
    df_quotes, required_carriers, min_credit, layer_limits, layer_names
):
    """
    Checks if the optimization problem is feasible given the constraints.

    Parameters:
    -----------
    df_quotes: DataFrame
        Quote data
    required_carriers: list
        List of carriers that must be included
    min_credit: int
        Minimum acceptable credit rating value
    layer_limits: list
        Capacity limits for each layer
    layer_names: list
        Names of the layers

    Returns:
    --------
    bool, str, dict
        Whether the problem is feasible, message explaining the result, and warnings dictionary
    """
    warnings = {}

    # Check if required carriers exist in the data
    for carrier in required_carriers:
        if carrier not in df_quotes["Carrier"].unique():
            return (
                False,
                f"Required carrier '{carrier}' not found in available quotes",
                warnings,
            )

    # Check if required carriers meet credit rating threshold
    for carrier in required_carriers:
        carrier_quotes = df_quotes[df_quotes["Carrier"] == carrier]
        if all(carrier_quotes["CreditRatingValue"] < min_credit):
            return (
                False,
                f"Required carrier '{carrier}' does not meet minimum credit rating threshold",
                warnings,
            )

    # Check if each layer has sufficient capacity
    for idx, layer in enumerate(layer_names):
        layer_quotes = df_quotes[df_quotes["Layer"] == layer]

        # Filter for quotes that meet credit rating threshold
        valid_quotes = layer_quotes[layer_quotes["CreditRatingValue"] >= min_credit]

        # Calculate total available capacity for this layer
        total_available_capacity = valid_quotes["Capacity"].sum()

        if total_available_capacity < layer_limits[idx]:
            return (
                False,
                f"Layer '{layer}' has insufficient capacity: available {total_available_capacity}, required {layer_limits[idx]}",
                warnings,
            )

        # Check if any valid quotes exist for this layer
        if len(valid_quotes) == 0:
            return (
                False,
                f"No valid quotes available for layer '{layer}' with the given credit rating threshold",
                warnings,
            )

    # Note which layers each required carrier can provide quotes for
    for carrier in required_carriers:
        carrier_layers = df_quotes[df_quotes["Carrier"] == carrier]["Layer"].unique()
        if len(carrier_layers) < len(layer_names):
            missing_layers = set(layer_names) - set(carrier_layers)
            warnings[carrier] = {
                "type": "missing_layers",
                "missing_layers": list(missing_layers),
                "available_layers": list(carrier_layers),
                "message": f"Required carrier '{carrier}' only provides quotes for layers: {', '.join(carrier_layers)}",
            }
            print(
                f"Note: {warnings[carrier]['message']} - will only require them in layers they can quote for"
            )

    return True, "Problem is feasible", warnings


def run_optimization_hierarchical(
    w_premium,
    w_coverage,
    required_carriers,
    min_credit,
    diversify,
    max_capacity_abs,
    min_capacity_abs=None,
    diversification_factor=0.5,
):
    """
    Hierarchical optimization approach that handles required carriers only in layers they can provide quotes for.

    Parameters:
    -----------
    w_premium: float
        Weight for premium minimization (1-5)
    w_coverage: float
        Weight for coverage maximization (1-5)
    required_carriers: list
        List of carriers that must be included (in layers they offer quotes)
    min_credit: int
        Minimum acceptable credit rating value
    diversify: bool
        Whether to apply diversification objectives
    max_capacity_abs: float
        Maximum absolute capacity per carrier per layer
    min_capacity_abs: float
        Minimum absolute capacity per carrier per layer
    diversification_factor: float
        Controls how strongly to enforce diversification (0-1)

    Returns:
    --------
    DataFrame, str
        Optimized allocation results and status message
    """
    # Debug log
    print(
        f"Starting hierarchical optimization with required carriers: {required_carriers}"
    )
    print(
        f"Parameters: w_premium={w_premium}, w_coverage={w_coverage}, min_credit={min_credit}"
    )
    print(f"Diversification: enabled={diversify}, factor={diversification_factor}")

    df_quotes = get_quote_data()
    layer_limits = [10, 10, 10]  # Each layer must have exactly 10M capacity
    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]

    # TIER 1: Feasibility Assessment
    feasibility_status, feasibility_message, warnings = check_feasibility(
        df_quotes, required_carriers, min_credit, layer_limits, layer_names
    )

    if not feasibility_status:
        print(f"Feasibility check failed: {feasibility_message}")
        return None, f"Infeasible: {feasibility_message}"

    # Record which carriers have which layers (for layer-specific requirements)
    carrier_available_layers = {}
    for carrier in required_carriers:
        if carrier in warnings:
            carrier_available_layers[carrier] = warnings[carrier]["available_layers"]
        else:
            # If no warning, carrier has all layers
            carrier_available_layers[carrier] = layer_names

    # TIER 2 & 3: Optimization with layer-specific carrier requirements
    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts(
        "x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous"
    )
    scale = 1e5

    # --- Core objective function ---
    # Normalize the weights to sum to 1
    total_weight = w_premium + w_coverage
    norm_w_premium = w_premium / total_weight
    norm_w_coverage = w_coverage / total_weight

    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        # Normalize premium by scale and invert coverage score (since we're minimizing)
        term = norm_w_premium * (row["Premium"] / scale) - norm_w_coverage * (
            row["Coverage_Score"] * row["Capacity"]
        )
        objective_terms.append(term * x_vars[i])

    # Add diversification penalty if enabled
    if diversify:
        diversification_penalties = []

        # For each carrier across all layers
        for carrier in df_quotes["Carrier"].unique():
            # Get all quotes from this carrier
            carrier_indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()

            # Calculate total capacity allocation for this carrier
            carrier_allocation = pulp.lpSum(
                df_quotes.loc[i, "Capacity"] * x_vars[i] for i in carrier_indices
            )

            # Add penalty variable for this carrier
            carrier_penalty = pulp.LpVariable(
                f"penalty_{carrier}", lowBound=0, cat="Continuous"
            )

            # The penalty is proportional to the allocation (encourages spreading)
            max_possible_allocation = sum(
                df_quotes.loc[i, "Capacity"] for i in carrier_indices
            )
            penalty_factor = diversification_factor / (
                max_possible_allocation * len(df_quotes["Carrier"].unique())
            )

            # Add constraint relating the penalty to the allocation
            prob += (
                carrier_penalty >= penalty_factor * carrier_allocation,
                f"Penalty_{carrier}",
            )

            # Add to the overall penalties
            diversification_penalties.append(carrier_penalty)

        # Add the diversification penalties to the objective
        objective_terms.extend(diversification_penalties)

    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"

    # --- Hard constraints ---

    # Layer capacity constraints - EXACTLY specified limit per layer
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()

        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            == layer_limits[idx],
            f"Layer_{layer}_Capacity",
        )

        # Create binary variables to indicate whether a carrier is used
        has_carrier = pulp.LpVariable.dicts(
            f"has_carrier_{layer}", indices, cat="Binary"
        )

        # Link the binary variables to the allocation variables
        for i in indices:
            # If x_vars[i] > 0, then has_carrier[i] = 1
            prob += x_vars[i] <= has_carrier[i], f"Link_{layer}_{i}_1"
            # Ensure has_carrier[i] is 0 if x_vars[i] = 0
            prob += has_carrier[i] <= x_vars[i] * 1000, f"Link_{layer}_{i}_2"

        # At least one carrier per layer
        prob += (
            pulp.lpSum(has_carrier[i] for i in indices) >= 1,
            f"Layer_{layer}_MinCarriers",
        )

    # Required carriers constraint - ensure they're included for the layers they can provide
    for carrier in required_carriers:
        if not isinstance(carrier, str):
            print(f"Warning: Invalid carrier type: {type(carrier)}, value: {carrier}")
            continue

        # Get available layers for this carrier
        available_layers = carrier_available_layers.get(carrier, layer_names)
        print(f"Carrier {carrier} can provide quotes for: {available_layers}")

        if not available_layers:
            print(f"Warning: Required carrier '{carrier}' has no available layers")
            continue

        # For each available layer, ensure the carrier is included
        for layer in available_layers:
            indices = df_quotes.index[
                (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
            ].tolist()

            if not indices:
                print(
                    f"Warning: Required carrier '{carrier}' doesn't have quotes for layer '{layer}'"
                )
                continue

            print(
                f"Adding constraint for required carrier {carrier} in layer {layer} with {len(indices)} quotes"
            )

            # Create a binary variable to indicate if this carrier is used in this layer
            use_carrier_in_layer = pulp.LpVariable(
                f"use_{carrier}_{layer}", cat="Binary"
            )

            # Force the carrier to be used in this layer
            prob += use_carrier_in_layer == 1, f"Force_{carrier}_{layer}"

            # Connect use_carrier_in_layer with x_vars - if any x_var > 0, then use_carrier_in_layer = 1
            for i in indices:
                prob += (
                    x_vars[i] <= use_carrier_in_layer,
                    f"Link_req_{carrier}_{layer}_{i}",
                )

            # If use_carrier_in_layer = 1, then at least one x_var > 0
            prob += (
                pulp.lpSum(x_vars[i] for i in indices) >= 0.001 * use_carrier_in_layer,
                f"Required_{carrier}_{layer}",
            )

    # Credit rating constraints
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"

    # --- Soft constraints for diversification ---
    if diversify:
        # Add soft max capacity constraints as guidelines
        if max_capacity_abs is not None:
            for carrier in df_quotes["Carrier"].unique():
                for layer in layer_names:
                    indices = df_quotes.index[
                        (df_quotes["Carrier"] == carrier)
                        & (df_quotes["Layer"] == layer)
                    ].tolist()

                    if indices:  # Only if this carrier has quotes for this layer
                        # Slack variable for violating max capacity
                        max_slack = pulp.LpVariable(
                            f"max_slack_{carrier}_{layer}", lowBound=0, cat="Continuous"
                        )

                        # Constraint with slack
                        prob += (
                            pulp.lpSum(
                                df_quotes.loc[i, "Capacity"] * x_vars[i]
                                for i in indices
                            )
                            <= max_capacity_abs + max_slack,
                            f"MaxCap_{carrier}_{layer}",
                        )

                        # Add penalty to objective for violating constraint
                        # Use a small penalty factor since it's a soft constraint
                        penalty_factor = 0.1 * norm_w_premium / scale
                        objective_terms.append(penalty_factor * max_slack)

        # Add soft min capacity constraints as guidelines
        if min_capacity_abs is not None:
            for carrier in df_quotes["Carrier"].unique():
                for layer in layer_names:
                    indices = df_quotes.index[
                        (df_quotes["Carrier"] == carrier)
                        & (df_quotes["Layer"] == layer)
                    ].tolist()

                    available_capacity = sum(
                        df_quotes.loc[i, "Capacity"] for i in indices
                    )

                    if indices and available_capacity >= min_capacity_abs:
                        # Slack variable for violating min capacity
                        min_slack = pulp.LpVariable(
                            f"min_slack_{carrier}_{layer}", lowBound=0, cat="Continuous"
                        )

                        # Constraint with slack
                        prob += (
                            pulp.lpSum(
                                df_quotes.loc[i, "Capacity"] * x_vars[i]
                                for i in indices
                            )
                            >= min_capacity_abs - min_slack,
                            f"MinCap_{carrier}_{layer}",
                        )

                        # Add penalty to objective for violating constraint
                        # Use a moderate penalty factor
                        penalty_factor = 0.3 * norm_w_premium / scale
                        objective_terms.append(penalty_factor * min_slack)

    # Update objective with all penalty terms
    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"

    # Solve the optimization problem
    solver = pulp.COIN_CMD(msg=0)
    prob.solve(solver)

    # Check if a solution was found
    if pulp.LpStatus[prob.status] != "Optimal":
        return None, pulp.LpStatus[prob.status]

    # Prepare results
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
    df_result["AllocationPercentage"] = (
        0.0  # Initialize as float to avoid dtype warning
    )
    for layer in df_result["Layer"].unique():
        layer_mask = df_result["Layer"] == layer
        total_alloc = df_result.loc[layer_mask, "SignedCapacity"].sum()
        if total_alloc > 0:
            allocation_percentages = (
                df_result.loc[layer_mask, "SignedCapacity"] / total_alloc * 100
            ).astype(float)
            df_result.loc[layer_mask, "AllocationPercentage"] = allocation_percentages

    # Verify required carriers are included in their available layers
    carrier_status = {}
    for carrier in required_carriers:
        available_layers = carrier_available_layers.get(carrier, [])
        included_layers = []
        missing_layers = []

        for layer in available_layers:
            layer_capacity = df_result[
                (df_result["Carrier"] == carrier) & (df_result["Layer"] == layer)
            ]["SignedCapacity"].sum()
            print(
                f"Carrier {carrier} signed capacity in layer {layer}: {layer_capacity}"
            )

            if layer_capacity > 0:
                included_layers.append(layer)
            else:
                missing_layers.append(layer)

        carrier_status[carrier] = {
            "available_layers": available_layers,
            "included_layers": included_layers,
            "missing_layers": missing_layers,
        }

        if not included_layers:
            print(
                f"WARNING: Required carrier {carrier} was not included in any of its available layers!"
            )
            return (
                None,
                f"Infeasible: Could not include required carrier {carrier} in any of its available layers",
            )

    # Calculate diversification metrics
    carrier_allocations = df_result.groupby("Carrier")["SignedCapacity"].sum()
    max_allocation = carrier_allocations.max()
    min_allocation = (
        carrier_allocations[carrier_allocations > 0].min()
        if len(carrier_allocations[carrier_allocations > 0]) > 0
        else 0
    )
    diversity_ratio = (
        max_allocation / min_allocation if min_allocation > 0 else float("inf")
    )

    print(f"Solution found with diversity ratio: {diversity_ratio:.2f}")
    print(f"Carriers used: {len(carrier_allocations[carrier_allocations > 0])}")

    # Prepare a message about carrier allocation
    carrier_notes = []
    for carrier, status in carrier_status.items():
        if len(status["available_layers"]) > 0 and len(status["included_layers"]) > 0:
            carrier_notes.append(
                f"Required carrier '{carrier}' included in {len(status['included_layers'])} layer(s)"
            )

    message = pulp.LpStatus[prob.status]
    if carrier_notes:
        message += " Note: " + "; ".join(carrier_notes)

    return df_result, message


def run_optimization_continuous(
    w_premium,
    w_coverage,
    required_carriers,
    min_credit,
    diversify,
    max_capacity_abs,
    min_capacity_abs=None,
):
    """
    Minimizes w_premium*(Premium/scale) - w_coverage*(Coverage_Score*Capacity).
    Normalizes per-layer to compute AllocationPercentage.
    """
    # Debug log
    print(f"Starting optimization with required carriers: {required_carriers}")

    df_quotes = get_quote_data()
    layer_limits = [10, 10, 10]  # Each layer must have exactly 10M capacity

    prob = pulp.LpProblem("Insurance_Placement_Optimization", pulp.LpMinimize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts(
        "x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous"
    )
    scale = 1e5

    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = w_premium * (row["Premium"] / scale) - w_coverage * (
            row["Coverage_Score"] * row["Capacity"]
        )
        objective_terms.append(term * x_vars[i])
    prob += pulp.lpSum(objective_terms), "Total_Weighted_Objective"

    # For each layer, the total capacity must be exactly 10M
    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()

        # Layer capacity constraint - EXACTLY 10M per layer
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            == layer_limits[idx],
            f"Layer_{layer}_Capacity",
        )

        # Create binary variables to indicate whether a carrier is used
        has_carrier = pulp.LpVariable.dicts(
            f"has_carrier_{layer}", indices, cat="Binary"
        )

        # Link the binary variables to the allocation variables
        for i in indices:
            # If x_vars[i] > 0, then has_carrier[i] = 1
            prob += x_vars[i] <= has_carrier[i], f"Link_{layer}_{i}_1"
            # Ensure has_carrier[i] is 0 if x_vars[i] = 0
            prob += has_carrier[i] <= x_vars[i] * 1000, f"Link_{layer}_{i}_2"

        # At least one carrier per layer
        prob += (
            pulp.lpSum(has_carrier[i] for i in indices) >= 1,
            f"Layer_{layer}_MinCarriers",
        )

    # Required carriers constraint - ensure they're actually included
    for carrier in required_carriers:
        if not isinstance(carrier, str):
            print(f"Warning: Invalid carrier type: {type(carrier)}, value: {carrier}")
            continue

        indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()

        if not indices:
            print(f"Warning: Required carrier '{carrier}' not found in quotes")
            continue

        print(
            f"Adding constraint for required carrier: {carrier} with {len(indices)} quotes"
        )

        # Create a binary variable to indicate if this carrier is used at all
        use_carrier = pulp.LpVariable(f"use_{carrier}", cat="Binary")

        # Force the carrier to be used (set use_carrier = 1)
        prob += use_carrier == 1, f"Force_{carrier}"

        # Connect use_carrier with x_vars - if any x_var > 0, then use_carrier = 1
        for i in indices:
            prob += x_vars[i] <= use_carrier, f"Link_req_{carrier}_{i}"

        # If use_carrier = 1, then at least one x_var > 0
        prob += (
            pulp.lpSum(x_vars[i] for i in indices) >= 0.001 * use_carrier,
            f"Required_{carrier}",
        )

    # Credit rating constraints
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"

    # Carrier diversification constraints
    if diversify and (max_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                prob += (
                    pulp.lpSum(
                        df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices
                    )
                    <= max_capacity_abs,
                    f"MaxCap_{carrier}_{layer}",
                )

    if diversify and (min_capacity_abs is not None):
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                available_capacity = sum(df_quotes.loc[i, "Capacity"] for i in indices)
                if available_capacity >= min_capacity_abs:
                    prob += (
                        pulp.lpSum(
                            df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices
                        )
                        >= min_capacity_abs,
                        f"MinCap_{carrier}_{layer}",
                    )

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
    df_result["AllocationPercentage"] = (
        0.0  # Initialize as float to avoid dtype warning
    )
    for layer in df_result["Layer"].unique():
        layer_mask = df_result["Layer"] == layer
        total_alloc = df_result.loc[layer_mask, "SignedCapacity"].sum()
        if total_alloc > 0:
            # Cast to float explicitly to avoid dtype warning
            allocation_percentages = (
                df_result.loc[layer_mask, "SignedCapacity"] / total_alloc * 100
            ).astype(float)
            df_result.loc[layer_mask, "AllocationPercentage"] = allocation_percentages

    # Verify required carriers are included
    if required_carriers:
        for carrier in required_carriers:
            carrier_capacity = df_result[df_result["Carrier"] == carrier][
                "SignedCapacity"
            ].sum()
            print(f"Carrier {carrier} total signed capacity: {carrier_capacity}")
            if carrier_capacity <= 0:
                print(
                    f"WARNING: Required carrier {carrier} was not included in the solution!"
                )

    return df_result, pulp.LpStatus[prob.status]


def run_optimization_max_coverage_with_premium_constraint(
    premium_threshold,
    required_carriers,
    min_credit,
    diversify,
    max_capacity_abs,
    min_capacity_abs=None,
):
    """
    Maximizes total coverage subject to total premium <= premium_threshold.
    """
    # Debug log
    print(
        f"Starting max coverage optimization with required carriers: {required_carriers}"
    )

    df_quotes = get_quote_data()
    layer_limits = [10, 10, 10]

    prob = pulp.LpProblem("Insurance_Placement_Max_Coverage", pulp.LpMaximize)
    num_quotes = df_quotes.shape[0]
    x_vars = pulp.LpVariable.dicts(
        "x", list(range(num_quotes)), lowBound=0, upBound=1, cat="Continuous"
    )

    # Objective: maximize total coverage score
    objective_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = row["Coverage_Score"] * row["Capacity"]
        objective_terms.append(term * x_vars[i])
    prob += pulp.lpSum(objective_terms), "Total_Coverage"

    # Premium constraint: total premium must be <= premium_threshold
    premium_terms = []
    for i in range(num_quotes):
        row = df_quotes.iloc[i]
        term = row["Premium"] * x_vars[i]
        premium_terms.append(term)
    prob += pulp.lpSum(premium_terms) <= premium_threshold, "Premium_Constraint"

    # For each layer, the total capacity must be exactly 10M (layer limit)
    layer_names = ["Primary $10M", "$10M xs $10M", "$10M xs $20M"]
    for idx, layer in enumerate(layer_names):
        indices = df_quotes.index[df_quotes["Layer"] == layer].tolist()

        # Layer capacity constraint
        prob += (
            pulp.lpSum(df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices)
            == layer_limits[idx],
            f"Layer_{layer}_Capacity",
        )

        # Create binary variables to indicate whether a carrier is used
        has_carrier = pulp.LpVariable.dicts(
            f"has_carrier_{layer}", indices, cat="Binary"
        )

        # Link the binary variables to the allocation variables
        for i in indices:
            prob += x_vars[i] <= has_carrier[i], f"Link_{layer}_{i}_1"
            prob += has_carrier[i] <= x_vars[i] * 1000, f"Link_{layer}_{i}_2"

        # At least one carrier per layer
        prob += (
            pulp.lpSum(has_carrier[i] for i in indices) >= 1,
            f"Layer_{layer}_MinCarriers",
        )

    # Required carriers constraint - ensure they're actually included
    for carrier in required_carriers:
        if not isinstance(carrier, str):
            print(f"Warning: Invalid carrier type: {type(carrier)}, value: {carrier}")
            continue

        indices = df_quotes.index[df_quotes["Carrier"] == carrier].tolist()

        if not indices:
            print(f"Warning: Required carrier '{carrier}' not found in quotes")
            continue

        print(
            f"Adding constraint for required carrier: {carrier} with {len(indices)} quotes"
        )

        # Create a binary variable to indicate if this carrier is used at all
        use_carrier = pulp.LpVariable(f"use_{carrier}", cat="Binary")

        # Force the carrier to be used (set use_carrier = 1)
        prob += use_carrier == 1, f"Force_{carrier}"

        # Connect use_carrier with x_vars - if any x_var > 0, then use_carrier = 1
        for i in indices:
            prob += x_vars[i] <= use_carrier, f"Link_req_{carrier}_{i}"

        # If use_carrier = 1, then at least one x_var > 0
        prob += (
            pulp.lpSum(x_vars[i] for i in indices) >= 0.001 * use_carrier,
            f"Required_{carrier}",
        )

    # Credit rating constraints
    for i in range(num_quotes):
        if df_quotes.loc[i, "CreditRatingValue"] < min_credit:
            prob += (x_vars[i] == 0), f"CreditRating_{i}"

    # Carrier diversification constraints
    if diversify and max_capacity_abs is not None:
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                if (
                    indices
                ):  # Only add constraint if carrier quotes exist for this layer
                    prob += (
                        pulp.lpSum(
                            df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices
                        )
                        <= max_capacity_abs,
                        f"MaxCap_{carrier}_{layer}",
                    )

    if diversify and min_capacity_abs is not None:
        for carrier in df_quotes["Carrier"].unique():
            for idx, layer in enumerate(layer_names):
                indices = df_quotes.index[
                    (df_quotes["Carrier"] == carrier) & (df_quotes["Layer"] == layer)
                ].tolist()
                available_capacity = sum(df_quotes.loc[i, "Capacity"] for i in indices)
                if available_capacity >= min_capacity_abs:
                    prob += (
                        pulp.lpSum(
                            df_quotes.loc[i, "Capacity"] * x_vars[i] for i in indices
                        )
                        >= min_capacity_abs,
                        f"MinCap_{carrier}_{layer}",
                    )

    solver = pulp.COIN_CMD(msg=0)
    status = prob.solve(solver)

    if pulp.LpStatus[status] != "Optimal":
        return None, None, pulp.LpStatus[status]

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
    df_result["AllocationPercentage"] = 0.0
    for layer in df_result["Layer"].unique():
        layer_mask = df_result["Layer"] == layer
        total_alloc = df_result.loc[layer_mask, "SignedCapacity"].sum()
        if total_alloc > 0:
            allocation_percentages = (
                df_result.loc[layer_mask, "SignedCapacity"] / total_alloc * 100
            ).astype(float)
            df_result.loc[layer_mask, "AllocationPercentage"] = allocation_percentages

    # Calculate metrics
    total_premium = df_result["SignedPremium"].sum()
    total_capacity = df_result["SignedCapacity"].sum()
    avg_coverage = (
        df_result["Coverage_Score"] * df_result["SignedCapacity"]
    ).sum() / total_capacity

    metrics = {
        "Achieved Premium": total_premium,
        "Achieved Average Coverage": avg_coverage,
    }

    # Verify required carriers are included
    if required_carriers:
        carriers_included = []
        for carrier in required_carriers:
            carrier_capacity = df_result[df_result["Carrier"] == carrier][
                "SignedCapacity"
            ].sum()
            print(f"Carrier {carrier} total signed capacity: {carrier_capacity}")
            carriers_included.append(carrier if carrier_capacity > 0 else None)

        if None in carriers_included:
            print(f"WARNING: Some required carriers were not included in the solution!")

        metrics["Required Carriers Included"] = [c for c in carriers_included if c]

    return df_result, metrics, pulp.LpStatus[status]
