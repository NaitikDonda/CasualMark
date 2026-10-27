# CausalMark v3 — Technical Audit Report
**Phase 0 Comprehensive Audit & Root-Cause Analysis**
*Date: October 2026 | Project: CausalMark v3 (AI-Powered Marketing Experiment Intelligence & Uplift Platform)*

---

## Executive Summary of Audit Findings

An exhaustive code-level audit was conducted across all 5 primary research notebooks, 18 metric artifact files, 23 knowledge base documents, and backend/frontend application services.

Six critical defects and four high-priority methodological issues were identified that directly explain the 6.5/10 review:
1. **AUUC evaluates to NaN (Critical)**: `uplift_curve.csv` contains NaN in the first 3 rows because the cumulative gain formula divided by 0 when either treated or control groups had 0 counts at fractional ranks $k \in \{1, 2, 3\}$. Passing this to `np.trapezoid` produced `nan`.
2. **27,189 Duplicates out of 35,000 Predictions (Critical)**: The Two-Model Uplift Estimator (RandomForestRegressor) predicted exactly `0.000000` for 23,520 rows (67.2% zero collapse) on binary conversion outcomes due to large `min_samples_leaf=50` and sparsity of conversion ($< 2\%$). The 3-column projection `(treatment, conversion, predicted_uplift)` collapsed to only 7,811 unique tuples.
3. **Criteo Treatment Imbalance in Early Slices (High)**: Criteo Uplift v2.1 has an 85% treatment / 15% control assignment mechanism. In small naive head reads (`nrows=1000`), small chunks occasionally exhibited zero control observations.
4. **Post-Treatment Leakage (`visit`, `exposure`) (Critical Causal Defect)**: In both Criteo and Hillstrom datasets, `visit` is a post-treatment mediator ($T \to M \to Y$). Naively controlling for it blocks the indirect causal effect and introduces conditioning-on-a-collider bias.
5. **NLP Fine-Tuning Class Collapse & Zero Surprise F1 (High)**: On the 6-class emotion benchmark, "surprise" has only 66 instances (3.3% of 2,000 test rows), while "joy" and "sadness" comprise 64% of the data. Without class-weighted loss or temperature thresholding, the LoRA adapter predicted 0 instances of surprise (Precision=0, Recall=0, F1=0).
6. **RAG Semantic Grounding Unverified (High)**: RAG decision engine evaluated only 3 static questions with TF-IDF retrieval, lacked numerical fact extraction, and had a strict similarity threshold that flagged `causal_effect_verified = false`.

---

## Detailed Issue Ledger

### Issue 1: AUUC Area Integral Resulting in NaN
- **Classification**: **CRITICAL** (Invalidates primary headline uplift metric)
- **Files Affected**: `notebooks/02_Uplift_Statistical_and_Criteo.ipynb` (Cells 6, 16, 18), `artifacts/metrics/uplift_metrics.csv`
- **Root Cause**:
  In Cell 6:
  ```python
  if len(treated) == 0 or len(control) == 0:
      gain = np.nan
  ```
  At index 0, 1, and 2 ($k=1, 2, 3$), all top-ranked customers belonged to treatment ($T=1$), resulting in `len(control) == 0` and setting the first 3 values of `uplift_gain` to `NaN`. When Cell 18 called `np.trapezoid(uplift_curve['uplift_gain'], uplift_curve['target_fraction'])`, NumPy propagated `NaN` across the entire integral, saving `observed_auuc = NaN` in `uplift_metrics.csv`.
- **Expected Behavior**: AUUC must be a finite, bounded numerical score representing the area between the model's cumulative gain curve and the random targeting diagonal.
- **Proposed Fix**:
  1. Standardize the metric to the canonical cumulative uplift curve with anchor `(0, 0)`:
     $$G(k) = Y_t(k) - Y_c(k) \cdot \frac{N_t(k)}{N_c(k)}$$
  2. For $k$ where $N_c(k) = 0$, impute baseline zero gain or forward-fill from 0 rather than injecting `NaN`.
  3. Compute both Raw AUUC and Normalized Qini Coefficient ($Q = \text{AUUC}_{\text{model}} - \text{AUUC}_{\text{random}}$) using trapezoidal integration over finite coordinates.
- **Verification Test**: `tests/test_uplift_evaluation.py` demonstrating non-NaN, finite AUUC across positive, null, and reversed synthetic benchmarks.

---

### Issue 2: 27,189 Duplicate Rows in Prediction Audit
- **Classification**: **CRITICAL** (Distorts out-of-sample prediction audit and indicates tree collapse)
- **Files Affected**: `notebooks/artifacts/metrics/criteo_test_uplift_predictions.csv`, `notebooks/02_Uplift_Statistical_and_Criteo.ipynb` (Cell 96, 98)
- **Root Cause**:
  `criteo_test_uplift_predictions.csv` was saved with only 3 columns: `['treatment', 'conversion', 'predicted_uplift']`. Because the outcome `conversion` is very sparse (1.8%) and `RandomForestRegressor` was fitted with `min_samples_leaf=50`, 23,520 test instances (67.2%) received an identical prediction of `0.000000`. Grouping by `['treatment', 'conversion', 'predicted_uplift']` resulted in 19,929 identical `[1, 0, 0.0]` rows and 3,591 `[0, 0, 0.0]` rows, generating 27,189 duplicates on a 3-column projection.
- **Expected Behavior**: Predictions must maintain customer/observation-level identifiers, continuous variance, and proper rank discrimination.
- **Proposed Fix**:
  1. Include observation index / unique ID in the test prediction audit.
  2. Implement Two-Model XGBoost / Logistic Estimators with calibrated probabilities to produce continuous, well-calibrated CATE predictions rather than collapsed leaf zeros.
  3. Formally document deduplication and prediction audit lineage in `reports/data_lineage.md`.
- **Verification Test**: `tests/test_prediction_audit.py` asserting unique test observation IDs and finite continuous distributions.

---

### Issue 3: Post-Treatment Leakage (`visit`, `exposure`)
- **Classification**: **CRITICAL** (Core econometrics error violating unconfoundedness)
- **Files Affected**: `notebooks/01_Causal_Experiment_Engine.ipynb`, `notebooks/02_Uplift_Statistical_and_Criteo.ipynb`
- **Root Cause**:
  In marketing campaign experiments, the causal graph is:
  $$\text{Treatment } (T) \longrightarrow \text{Visit / Click } (M) \longrightarrow \text{Conversion } (Y)$$
  Conditioning on `visit` or `exposure` blocks the indirect causal path through which marketing produces conversions. If unobserved factors $U$ affect both visits and purchases, conditioning on the mediator $M$ induces collider stratification bias.
- **Expected Behavior**: The feature adjustment set $X$ must strictly contain verified pre-treatment covariates.
- **Proposed Fix**:
  1. Construct a formal Causal DAG explicitly separating pre-treatment confounders $X$ from mediators $M$ and outcome $Y$.
  2. Exclude `visit` and `exposure` from the primary CATE and ATE adjustment sets.
  3. Implement mediation analysis (reporting Total Effect vs. Direct Effect) and a Placebo Negative Control test.
- **Verification Test**: `tests/test_causal_leakage.py` asserting that no prohibited post-treatment features enter estimator training matrices.

---

### Issue 4: NLP 6-Class Emotion Collapse on "Surprise"
- **Classification**: **HIGH** (Severe class imbalance destroying macro metrics)
- **Files Affected**: `notebooks/03_NLP_Finetuning_Small_Model.ipynb`, `notebooks/qwen3_emotion_evaluation_full.csv`
- **Root Cause**:
  In the DAIR-AI emotion dataset, "surprise" has only 66 instances out of 2,000 (3.3%), while "joy" and "sadness" have 1,276 instances (63.8%). Without class-weighted loss or temperature-calibrated decoding, the fine-tuned Qwen 8B LoRA adapter defaulted to majority classes, yielding 0 precision, recall, and F1 for "surprise".
- **Expected Behavior**: Class-balanced evaluation, weighted loss during instruction tuning, and grouping into high-confidence marketing sentiment/intent classes with cross-validation confidence intervals.
- **Proposed Fix**:
  1. Provide class-weighted evaluation and confidence intervals across 3 random seeds.
  2. Offer a 3-class marketing sentiment re-framing (Positive, Neutral, Negative) achieving >78% accuracy and robust macro F1.
- **Verification Test**: `tests/test_nlp_benchmark.py` verifying macro F1, confusion matrices, and seed reporting.

---

### Issue 5: RAG Grounding Verification Failure
- **Classification**: **HIGH** (RAG pipeline reports `causal_effect_verified = false`)
- **Files Affected**: `backend/rag_service.py`, `notebooks/04_RAG_Decision_Engine.ipynb`
- **Root Cause**:
  The RAG decision engine tested only 3 questions using basic TF-IDF retrieval, lacked explicit source citation parsing, and compared generated answers against raw text with an unrealistic verbatim threshold, causing `causal_effect_verified` to evaluate to `false`.
- **Expected Behavior**: Structured citation parsing (e.g. `[E1]`, `[E2]`), exact numerical containment verification against published experiment metrics, and deterministic evidence binding.
- **Proposed Fix**:
  1. Standardize the evidence corpus with stable IDs (`E1`, `E2`, ...).
  2. Implement an automated Grounding Verifier checking numerical accuracy and citation resolution.
  3. When all cited facts match the knowledge base, assert `causal_effect_verified = true`.
- **Verification Test**: `tests/test_rag_grounding.py` evaluating precision@K, hit rate, and citation resolution rate.
