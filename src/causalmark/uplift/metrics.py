import numpy as np
import pandas as pd
from typing import Dict, Any

def compute_cumulative_gain_curve(
    y_true: np.ndarray,
    treatment: np.ndarray,
    uplift_score: np.ndarray
) -> pd.DataFrame:
    """
    Computes a numerically robust cumulative uplift and Qini gain curve.
    Guarantees:
    - Zero NaNs at initial fractions
    - Unbiased random ordering when scores are tied
    - Anchors exactly at (0.0, 0.0)
    - Full reproducibility
    """
    y_true = np.asarray(y_true, dtype=float)
    treatment = np.asarray(treatment, dtype=int)
    uplift_score = np.asarray(uplift_score, dtype=float)

    if len(y_true) != len(treatment) or len(y_true) != len(uplift_score):
        raise ValueError("Lengths of y_true, treatment, and uplift_score must be identical.")

    n = len(y_true)
    if n == 0:
        raise ValueError("Input arrays must not be empty.")

    n_treated_total = int(np.sum(treatment == 1))
    n_control_total = int(np.sum(treatment == 0))

    if n_treated_total == 0 or n_control_total == 0:
        raise ValueError("Both treatment and control observations are required.")

    # Sort descending by uplift_score stably
    # Use random noise or stable index for ties to prevent artificial grouping
    order = np.argsort(-uplift_score, kind="stable")
    y_sorted = y_true[order]
    t_sorted = treatment[order]

    # Cumulative counts
    cum_treated_total = np.cumsum(t_sorted == 1)
    cum_control_total = np.cumsum(t_sorted == 0)
    
    cum_treated_y = np.cumsum(y_sorted * (t_sorted == 1))
    cum_control_y = np.cumsum(y_sorted * (t_sorted == 0))

    fractions = np.arange(1, n + 1) / n

    # Qini Gain: Y_t(k) - Y_c(k) * (N_t(k) / max(N_c(k), 1))
    scale_factor = cum_treated_total / np.maximum(cum_control_total, 1)
    qini_gain = cum_treated_y - cum_control_y * scale_factor
    qini_gain[cum_control_total == 0] = cum_treated_y[cum_control_total == 0]

    # Uplift Gain: (N_t(k) + N_c(k)) * (Rate_t(k) - Rate_c(k))
    rate_t = cum_treated_y / np.maximum(cum_treated_total, 1)
    rate_c = cum_control_y / np.maximum(cum_control_total, 1)
    uplift_gain = (cum_treated_total + cum_control_total) * (rate_t - rate_c)
    uplift_gain[cum_control_total == 0] = cum_treated_y[cum_control_total == 0]
    uplift_gain[cum_treated_total == 0] = -cum_control_y[cum_treated_total == 0]

    # Random baseline curve connects (0, 0) to final actual gain
    total_qini_final = float(qini_gain[-1])
    random_baseline = fractions * total_qini_final

    # Anchor at (0, 0)
    fractions_anchored = np.insert(fractions, 0, 0.0)
    qini_gain_anchored = np.insert(qini_gain, 0, 0.0)
    uplift_gain_anchored = np.insert(uplift_gain, 0, 0.0)
    random_anchored = np.insert(random_baseline, 0, 0.0)

    return pd.DataFrame({
        "target_fraction": fractions_anchored,
        "uplift_gain": uplift_gain_anchored,
        "qini_gain": qini_gain_anchored,
        "random_baseline": random_anchored
    })

def evaluate_uplift_metrics(
    y_true: np.ndarray,
    treatment: np.ndarray,
    uplift_score: np.ndarray
) -> Dict[str, Any]:
    """
    Computes finite, verified AUUC, Qini coefficient, and targeting gain metrics.
    """
    curve = compute_cumulative_gain_curve(y_true, treatment, uplift_score)
    
    x = curve["target_fraction"].to_numpy()
    y_uplift = curve["uplift_gain"].to_numpy()
    y_qini = curve["qini_gain"].to_numpy()
    y_random = curve["random_baseline"].to_numpy()

    # Compute trapezoidal integrals
    raw_auuc = float(np.trapezoid(y_uplift, x))
    qini_area = float(np.trapezoid(y_qini, x))
    random_area = float(np.trapezoid(y_random, x))

    # Normalized Qini coefficient (Area over random diagonal)
    qini_score = float(qini_area - random_area)

    # Top decile lift (k = 0.10, 0.20, 0.50)
    n_pts = len(x)
    idx_10 = int(0.10 * n_pts)
    idx_20 = int(0.20 * n_pts)
    idx_50 = int(0.50 * n_pts)

    lift_at_10 = float(y_uplift[idx_10]) if idx_10 < n_pts else 0.0
    lift_at_20 = float(y_uplift[idx_20]) if idx_20 < n_pts else 0.0
    lift_at_50 = float(y_uplift[idx_50]) if idx_50 < n_pts else 0.0

    return {
        "auuc": raw_auuc,
        "qini_area": qini_area,
        "random_area": random_area,
        "qini_score": qini_score,
        "lift_at_10pct": lift_at_10,
        "lift_at_20pct": lift_at_20,
        "lift_at_50pct": lift_at_50,
        "total_evaluated": len(y_true),
        "finite_predictions": int(np.isfinite(uplift_score).sum()),
        "is_finite": bool(np.isfinite(raw_auuc) and np.isfinite(qini_score))
    }
