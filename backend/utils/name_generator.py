# -*- coding: utf-8 -*-
"""
Lightweight experiment name generator inspired by Docker's memorable naming convention.
Generates names like: "curious_curie", "analytical_aristotle", "precise_pascal"
"""

import random


# AI/ML/Science themed adjectives
ADJECTIVES = [
    # Analytical & Precision
    "precise", "analytical", "rigorous", "meticulous", "systematic",
    "thorough", "methodical", "accurate", "exact", "detailed",
    
    # Discovery & Innovation
    "curious", "innovative", "exploratory", "pioneering", "groundbreaking",
    "revolutionary", "ingenious", "inventive", "visionary", "bold",
    
    # Intelligence & Insight
    "brilliant", "insightful", "clever", "astute", "perceptive",
    "sharp", "keen", "discerning", "intelligent", "wise",
    
    # Performance & Quality
    "optimal", "efficient", "robust", "reliable", "superior",
    "outstanding", "excellent", "refined", "polished", "advanced",
    
    # Discovery & Research
    "investigative", "inquisitive", "thoughtful", "observant", "empirical",
    "experimental", "hypothesis-driven", "evidence-based", "logical", "rational"
]

# Famous scientists, mathematicians, and AI pioneers
SCIENTISTS = [
    # Classical Scientists
    "newton", "einstein", "curie", "darwin", "galileo", "kepler", "tesla",
    "faraday", "maxwell", "bohr", "heisenberg", "schrodinger", "planck",
    
    # Mathematicians
    "euler", "gauss", "riemann", "fibonacci", "pascal", "fermat", "cauchy",
    "fourier", "laplace", "bernoulli", "descartes", "pythagoras",
    
    # Computer Science Pioneers
    "turing", "lovelace", "babbage", "vonneumann", "shannon", "dijkstra",
    "knuth", "hopper", "torvalds", "berners_lee",
    
    # AI/ML Pioneers
    "mccarthy", "minsky", "hinton", "lecun", "bengio", "ng", "karpathy",
    "goodfellow", "schmidhuber", "russell", "norvig",
    
    # Data Science & Statistics
    "fisher", "pearson", "bayes", "gosset", "tukey", "box", "cox",
    
    # Contemporary Tech Figures
    "page", "brin", "jobs", "wozniak", "gates", "bezos", "musk"
]


def generate_experiment_name(seed=None):
    """
    Generate a memorable experiment name in the format: {adjective}_{scientist}
    
    Args:
        seed: Optional seed for reproducible names
    
    Returns:
        str: Generated name like "curious_curie" or "analytical_einstein"
        
    Examples:
        >>> generate_experiment_name()
        "precise_pascal"
        >>> generate_experiment_name(42)
        "brilliant_hinton"
    """
    if seed is not None:
        random.seed(seed)
    
    adjective = random.choice(ADJECTIVES)
    scientist = random.choice(SCIENTISTS)
    
    return "{}_{}" .format(adjective, scientist)


def generate_unique_experiment_name(existing_names=None, max_attempts=100):
    """
    Generate a unique experiment name that doesn't conflict with existing names.
    
    Args:
        existing_names: list of existing experiment names to avoid
        max_attempts: Maximum attempts to generate a unique name
    
    Returns:
        str: Unique experiment name
        
    Raises:
        RuntimeError: If unable to generate unique name within max_attempts
    """
    existing_names = existing_names or []
    
    for _ in range(max_attempts):
        name = generate_experiment_name()
        if name not in existing_names:
            return name
    
    # Fallback: append timestamp if we can't generate unique name
    import datetime
    timestamp = datetime.datetime.now().strftime("%H%M")
    base_name = generate_experiment_name()
    return "{}_{}".format(base_name, timestamp)


def generate_experiment_display_name(config=None, name=None):
    """
    Generate a full display name combining memorable name with technical details.
    
    Args:
        config: Experiment configuration dict with 'selected_groups', 'top_k', etc.
        name: Base memorable name (will generate if not provided)
    
    Returns:
        str: Display name like "Curious Curie | RAGAS+LLM (k=5, t=0.5)"
        
    Examples:
        >>> config = {"selected_groups": ["llm", "ragas"], "top_k": 5, "similarity_threshold": 0.5}
        >>> generate_experiment_display_name(config, "curious_curie")
        "Curious Curie | LLM+RAGAS Assessment (k=5, t=0.5)"
    """
    if name is None:
        name = generate_experiment_name()
    
    # Convert to title case for display
    display_name = name.replace("_", " ").title()
    
    if config:
        # Extract technical details
        groups = config.get("selected_groups", [])
        top_k = config.get("top_k", 5)
        threshold = config.get("similarity_threshold", 0.5)
        
        # Format group names
        if groups:
            groups_str = "+".join(g.upper() for g in sorted(groups))
            technical_part = "{} Assessment (k={}, t={})".format(groups_str, top_k, threshold)
            return "{} | {}".format(display_name, technical_part)
    
    return display_name


def get_name_stats():
    """
    Get statistics about the name generator's vocabulary.
    
    Returns:
        dict: Statistics about adjectives, scientists, and total combinations
    """
    return {
        "adjectives_count": len(ADJECTIVES),
        "scientists_count": len(SCIENTISTS),
        "total_combinations": len(ADJECTIVES) * len(SCIENTISTS),
        "sample_names": [generate_experiment_name() for _ in range(5)]
    }


if __name__ == "__main__":
    # Demo the name generator
    print("Experiment Name Generator Demo")
    print("=" * 40)
    
    # Generate some sample names
    print("Sample Generated Names:")
    for i in range(10):
        name = generate_experiment_name()
        display_name = generate_experiment_display_name(
            config={"selected_groups": ["llm", "ragas"], "top_k": 5, "similarity_threshold": 0.5},
            name=name
        )
        print("  * {}".format(display_name))
    
    print("\nVocabulary Stats:")
    stats = get_name_stats()
    print("  • {} adjectives".format(stats['adjectives_count']))
    print("  • {} scientists".format(stats['scientists_count']))
    print("  • {:,} total combinations".format(stats['total_combinations']))
    
    # Test uniqueness
    print("\nUniqueness Test (100 names):")
    test_names = [generate_experiment_name() for _ in range(100)]
    unique_names = len(set(test_names))
    print("  • {}/100 unique ({}% uniqueness)".format(unique_names, unique_names))