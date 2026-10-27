from math import sqrt
from statistics import NormalDist


def calculate_lift(treatment_conversions, treatment_users,
                   control_conversions, control_users):
    if treatment_users <= 0 or control_users <= 0:
        raise ValueError("Group sizes must be positive.")

    if not 0 <= treatment_conversions <= treatment_users:
        raise ValueError("Invalid treatment conversions.")

    if not 0 <= control_conversions <= control_users:
        raise ValueError("Invalid control conversions.")

    treatment_rate = treatment_conversions / treatment_users
    control_rate = control_conversions / control_users

    absolute_lift_pp = (treatment_rate - control_rate) * 100
    relative_lift_pct = (
        (treatment_rate - control_rate) / control_rate * 100
        if control_rate > 0 else None
    )

    return {
        "treatment_rate_pct": round(treatment_rate * 100, 4),
        "control_rate_pct": round(control_rate * 100, 4),
        "absolute_lift_pp": round(absolute_lift_pp, 4),
        "relative_lift_pct": (
            round(relative_lift_pct, 4)
            if relative_lift_pct is not None else None
        )
    }


def test_conversion_significance(treatment_conversions, treatment_users,
                                 control_conversions, control_users,
                                 alpha=0.05):
    if treatment_users <= 0 or control_users <= 0:
        raise ValueError("Group sizes must be positive.")

    if not 0 <= treatment_conversions <= treatment_users:
        raise ValueError("Invalid treatment conversions.")

    if not 0 <= control_conversions <= control_users:
        raise ValueError("Invalid control conversions.")

    if not 0 < alpha < 1:
        raise ValueError("Alpha must be between 0 and 1.")

    p_t = treatment_conversions / treatment_users
    p_c = control_conversions / control_users
    pooled = (
        treatment_conversions + control_conversions
    ) / (treatment_users + control_users)

    se = sqrt(
        pooled * (1 - pooled) *
        (1 / treatment_users + 1 / control_users)
    )

    z = (p_t - p_c) / se if se else 0
    p_value = 2 * (1 - NormalDist().cdf(abs(z)))

    return {
        "z_score": round(z, 4),
        "p_value": round(p_value, 6),
        "alpha": alpha,
        "statistically_significant": p_value < alpha
    }


def analyze_experiment(treatment_conversions, treatment_users,
                       control_conversions, control_users,
                       alpha=0.05):
    return {
        "conversion_analysis": calculate_lift(
            treatment_conversions, treatment_users,
            control_conversions, control_users
        ),
        "significance_analysis": test_conversion_significance(
            treatment_conversions, treatment_users,
            control_conversions, control_users, alpha
        )
    }
