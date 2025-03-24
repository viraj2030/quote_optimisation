# config.py
# Global Configuration for the Insurance Placement Optimizer

# Define each layer with a name and its capacity limit (in dollars)
LAYERS = [
    {"name": "Primary $10M", "limit": 10e6},
    {"name": "$10M xs $10M", "limit": 10e6},
    {"name": "$10M xs $20M", "limit": 10e6},
]

# Mapping for credit rating values (the higher the number, the better the rating)
CREDIT_RATING_MAPPING = {
    1: "AAA",
    2: "AA",
    3: "A",
    4: "BBB",
    5: "BB",
    6: "B",
}

# Penalty parameters (big-M constants) for slack variables in the optimization
PENALTY_PREMIUM = 1e6
PENALTY_COVERAGE = 1e6
