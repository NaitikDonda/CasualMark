# CausalMark v3 — Uplift Evaluation & Headline Metrics Report
**Phase 3 Metric Reparation: Resolving AUUC NaN & Standardizing Qini Curves**
*Date: October 2026 | Platform: CausalMark v3*

---

## 1. Problem Identification: Why AUUC Was Reported as NaN

In previous evaluation runs, `artifacts/metrics/uplift_metrics.csv` displayed `observed_auuc = NaN`.
Tracing through `notebooks/02_Uplift_Statistical_and_Criteo.ipynb` revealed the exact failure mechanism:
1. At the earliest evaluation fractions $k \in \{1, 2, 3\}$, the top-ranked observations were all treatment group observations ($N_c(k) = 0$).
2. The naive code assigned `gain = np.nan` whenever $N_c(k) == 0$.
3. When `np.trapezoid(uplift_curve["uplift_gain"], uplift_curve["target_fraction"])` was executed, NumPy propagated `NaN` across the integral.

---

## 2. Mathematical Definition of Corrected Metrics

### Cumulative Qini Gain:
$$Q(k) = Y_t(k) - Y_c(k) \cdot \frac{N_t(k)}{\max(N_c(k), 1)}$$
Where $Y_t(k)$ and $Y_c(k)$ are the cumulative conversions in treatment and control among the top-$k$ prioritized users.

### Cumulative Uplift Gain:
$$U(k) = (N_t(k) + N_c(k)) \cdot \left( \frac{Y_t(k)}{\max(N_t(k), 1)} - \frac{Y_c(k)}{\max(N_c(k), 1)} \right)$$

### Anchoring & Integration:
- Both curves are anchored at $(0.0, 0.0)$.
- Integration is performed with standard trapezoidal quadrature over sorted percentiles:
  $$\text{AUUC} = \int_{0}^{1} U(k) \, dk$$
  $$\text{Qini Score} = \int_{0}^{1} Q(k) \, dk - \int_{0}^{1} Q_{\text{random}}(k) \, dk$$

---

## 3. Corrected Results on Benchmark Datasets

| Dataset | Evaluated Model | Raw AUUC | Qini Area | Normalized Qini Score | Lift @ Top 10% | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hillstrom Email** | Causal Forest (42,613 users) | **311.1718** | **162.9672** | **+90.4700** | +4.80% | **Verified (Finite)** |
| **Criteo Uplift** | Two-Model XGBoost (35,000 users) | **12.9136** | **2.8415** | **+0.1842** | +7.97 conversions | **Verified (Finite)** |

All metrics have been verified via `tests/test_uplift_evaluation.py`, confirming zero NaNs, monotonic ranking discrimination, and clean finite baseline bounds.
