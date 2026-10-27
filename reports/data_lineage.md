# CausalMark v3 — Data Lineage & Pipeline Provenance Report
**Phase 1 & Phase 4 Audit: Explaining Duplicates & Documenting Clean Splits**
*Date: October 2026 | Platform: CausalMark v3*

---

## 1. Investigation of the 27,189 "Duplicate Rows"

### Finding:
The previously reported finding of *27,189 duplicate rows in a 35,000-row prediction dataset* was audited against `artifacts/metrics/criteo_test_uplift_predictions.csv`.

1. **Schema of Stored File**:
   The output CSV contained only 3 summary columns:
   `columns = ['treatment', 'conversion', 'predicted_uplift']`
2. **Mechanism of Row Repetition**:
   - The outcome `conversion` is sparse (mean rate 1.78%).
   - The model was trained with `min_samples_leaf=50`.
   - For **23,520 rows (67.2%)**, the two-model leaf subtraction yielded an exact predicted uplift of `0.000000`.
   - In a 3-column projection without observation IDs, all instances with `(treatment=1, conversion=0, predicted_uplift=0.0)` collapsed into identical value tuples (19,929 identical rows).
   - This was an artifact of dropping feature columns and unique user index upon serialization, combined with regression leaf zero-clipping on sparse conversions.

---

## 2. Verified Data Lineage & Preprocessing Policy

### Pipeline Stages:
```
Raw Dataset (GZ / CSV) 
   │
   ▼ (Fingerprint Hash SHA-256)
Validation & Schema Assertion 
   │
   ▼ (Drop unobserved / malformed records)
Stratified Split on (T, Y) (Train: 75%, Test: 25%)
   │
   ▼ (Fit scalers and imputation strictly on Train)
Model Training (Causal Forest / Two-Model Estimators)
   │
   ▼ (Held-out Test Predictions with Unique Row IDs)
Prediction Audit & Uplift Metric Computation
```

### Dataset Fingerprints:
- **Criteo Uplift Benchmark**:
  - Raw archive: `data/marketing_instructions/raw/criteo-research-uplift-v2.1.csv.gz`
  - Evaluated sample rows: 35,000 test observations (140,000 total sampled across chunks)
  - Features: 12 pre-treatment continuous covariates ($f_0 \dots f_{11}$)
  - Target Treatment: `treatment` ($T \in \{0, 1\}$; 85% treated / 15% control)
  - Target Outcome: `conversion` ($Y \in \{0, 1\}$; overall mean 1.84%)
  - Post-treatment mediators excluded: `visit`, `exposure`.
- **Hillstrom Email Marketing**:
  - Observations: 42,613 unique customer records
  - Cleaned features: `recency`, `history`, `mens`, `womens`, `zip_code`, `newbie`, `channel`
  - Zero duplicate customer IDs.
