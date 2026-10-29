"""
ML Uplift Inference Service
Loads genuine trained uplift models (X-Learner, T-Learner, S-Learner) and generates
validated numerical predictions for customer conversion under control, conversion under treatment,
and estimated uplift (treatment effect).
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_MODEL_DIR = PROJECT_ROOT / "models" / "causal" / "improved"
DEFAULT_EVAL_DIR = PROJECT_ROOT / "data" / "evaluation"

EXPECTED_FEATURES = [
    "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "visit", "exposure"
]


class CustomerFeatureRecord(BaseModel):
    customer_id: Optional[Union[str, int]] = "CUST_001"
    f0: float
    f1: float
    f2: float
    f3: float
    f4: float
    f5: float
    f6: float
    f7: float
    f8: float
    f9: float
    f10: float
    f11: float
    visit: Optional[float] = 0.0
    exposure: Optional[float] = 0.0


class UpliftPredictBatchRequest(BaseModel):
    model_name: Optional[str] = "X-Learner"  # "X-Learner", "T-Learner", or "S-Learner"
    customers: List[CustomerFeatureRecord]


class UpliftSinglePrediction(BaseModel):
    customer_id: str
    control_conversion_prob: float
    treatment_conversion_prob: float
    predicted_uplift: float
    predicted_uplift_percentage_points: float
    targeting_recommendation: str
    targeting_tier: str


class UpliftPredictionResponse(BaseModel):
    model_name: str
    model_version: str
    algorithm: str
    champion_status: str
    predictions: List[UpliftSinglePrediction]
    summary: Dict[str, Any]
    causal_assumptions: List[str]
    evaluation_caveats: str


class MlUpliftService:
    _models_cache: Dict[str, Any] = {}
    _metadata_cache: Optional[Dict[str, Any]] = None
    _comparison_cache: Optional[Dict[str, Any]] = None

    @classmethod
    def get_metadata(cls) -> Dict[str, Any]:
        if cls._metadata_cache is None:
            meta_file = DEFAULT_MODEL_DIR / "model_metadata.json"
            if meta_file.exists():
                with open(meta_file, "r", encoding="utf-8") as f:
                    cls._metadata_cache = json.load(f)
            else:
                cls._metadata_cache = {
                    "model_name": "X-Learner",
                    "model_version": "1.0.0",
                    "algorithm": "ExtraTreesRegressor (300 estimators, min_samples_leaf=10)",
                    "feature_columns": EXPECTED_FEATURES,
                    "causal_status": "Provisional Champion (Unverified Causal Effect)"
                }
        return cls._metadata_cache

    @classmethod
    def get_comparison_report(cls) -> Dict[str, Any]:
        if cls._comparison_cache is None:
            report_file = DEFAULT_EVAL_DIR / "criteo_uplift_model_comparison_report.json"
            if report_file.exists():
                with open(report_file, "r", encoding="utf-8") as f:
                    cls._comparison_cache = json.load(f)
            else:
                cls._comparison_cache = {}
        return cls._comparison_cache

    @classmethod
    def load_model(cls, model_name: str = "X-Learner") -> Dict[str, Any]:
        name_key = model_name.strip().lower().replace("-", "_").replace(" ", "_")
        filename_map = {
            "x_learner": "x_learner.joblib",
            "t_learner": "t_learner.joblib",
            "s_learner": "s_learner.joblib",
            "xlearner": "x_learner.joblib",
            "tlearner": "t_learner.joblib",
            "slearner": "s_learner.joblib"
        }
        filename = filename_map.get(name_key, "x_learner.joblib")
        model_path = DEFAULT_MODEL_DIR / filename

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model artifact '{filename}' not found at {model_path}. "
                f"Please run the training pipeline first: python src/causalmark/uplift/training_pipeline.py"
            )

        if filename not in cls._models_cache:
            cls._models_cache[filename] = joblib.load(model_path)

        return cls._models_cache[filename]

    @classmethod
    def predict(
        cls,
        customer_records: List[Dict[str, Any]],
        model_name: str = "X-Learner"
    ) -> UpliftPredictionResponse:
        """
        Accepts raw customer dictionaries, validates features, executes ML uplift inference,
        and returns structured predictions and targeting advice.
        """
        if not customer_records:
            raise ValueError("No customer records provided for prediction.")

        resolved_model_name = "X-Learner"
        if "s" in model_name.lower():
            resolved_model_name = "S-Learner"
        elif "t" in model_name.lower():
            resolved_model_name = "T-Learner"

        artifact = cls.load_model(resolved_model_name)
        feature_cols = artifact.get("feature_columns", EXPECTED_FEATURES)

        # Convert to DataFrame and validate columns
        df_input = pd.DataFrame(customer_records)
        missing_cols = [c for c in feature_cols if c not in df_input.columns]
        if missing_cols:
            raise ValueError(
                f"Input missing required feature columns: {missing_cols}. "
                f"Expected features: {feature_cols}"
            )

        X = df_input[feature_cols].copy()
        X = X.apply(pd.to_numeric, errors="coerce")
        if X.isnull().any().any():
            raise ValueError("Input contains non-numeric or missing values in feature fields.")

        # Compute predictions based on learner architecture
        if resolved_model_name == "T-Learner":
            mu1 = artifact["model_treated"].predict(X)
            mu0 = artifact["model_control"].predict(X)
            mu1 = np.clip(mu1, 0.0, 1.0)
            mu0 = np.clip(mu0, 0.0, 1.0)
            uplift = mu1 - mu0

        elif resolved_model_name == "S-Learner":
            X_t = X.copy()
            X_t["treatment"] = 1
            X_c = X.copy()
            X_c["treatment"] = 0
            mu1 = np.clip(artifact["model"].predict(X_t), 0.0, 1.0)
            mu0 = np.clip(artifact["model"].predict(X_c), 0.0, 1.0)
            uplift = mu1 - mu0

        else:  # X-Learner
            mu1_base = np.clip(artifact["outcome_treated"].predict(X), 0.0, 1.0)
            mu0_base = np.clip(artifact["outcome_control"].predict(X), 0.0, 1.0)
            d1_pred = artifact["effect_treated"].predict(X)
            d0_pred = artifact["effect_control"].predict(X)
            prop = artifact.get("propensity", 0.849)

            uplift = (1.0 - prop) * d1_pred + prop * d0_pred
            # Consistent potential outcome estimates anchored to base outcome and uplift
            mu0 = mu0_base
            mu1 = np.clip(mu0_base + uplift, 0.0, 1.0)

        # Build output objects
        predictions = []
        for i, row in enumerate(customer_records):
            cid = str(row.get("customer_id", f"CUST_{i+1:03d}"))
            p_ctrl = float(mu0[i])
            p_treat = float(mu1[i])
            u_val = float(uplift[i])
            u_pct = float(u_val * 100.0)

            # Prescriptive targeting recommendation based on uplift value
            if u_pct >= 0.5:
                tier = "High Priority Persuadable"
                action = "Target with Marketing Campaign (Strong Positive Incremental Conversion Expected)"
            elif u_pct > 0.05:
                tier = "Moderate Persuadable"
                action = "Consider Targeting (Marginal Incremental Conversion Expected)"
            elif abs(u_pct) <= 0.05:
                tier = "Neutral / Sure Thing / Lost Cause"
                action = "Do Not Target (Zero or Negligible Uplift, Save Marketing Budget)"
            else:
                tier = "Sleeping Dog / Do Not Disturb"
                action = "Strictly Avoid Targeting (Negative Treatment Effect Detected)"

            predictions.append(UpliftSinglePrediction(
                customer_id=cid,
                control_conversion_prob=round(p_ctrl, 6),
                treatment_conversion_prob=round(p_treat, 6),
                predicted_uplift=round(u_val, 6),
                predicted_uplift_percentage_points=round(u_pct, 4),
                targeting_recommendation=action,
                targeting_tier=tier
            ))

        meta = cls.get_metadata()
        comp = cls.get_comparison_report()
        champ_info = comp.get("champion_selection", {})

        summary = {
            "total_customers_evaluated": len(predictions),
            "mean_predicted_uplift": round(float(np.mean(uplift)), 6),
            "mean_predicted_uplift_pct": round(float(np.mean(uplift) * 100.0), 4),
            "positive_uplift_count": int(np.sum(uplift > 0.0005)),
            "neutral_uplift_count": int(np.sum(np.abs(uplift) <= 0.0005)),
            "negative_uplift_count": int(np.sum(uplift < -0.0005)),
            "recommended_targets_count": int(np.sum(uplift > 0.0005))
        }

        return UpliftPredictionResponse(
            model_name=resolved_model_name,
            model_version=meta.get("model_version", "1.0.0"),
            algorithm=meta.get("algorithm", "ExtraTreesRegressor (300 trees, min_samples_leaf=10)"),
            champion_status=champ_info.get("status", "Provisional Champion"),
            predictions=predictions,
            summary=summary,
            causal_assumptions=champ_info.get("causal_assumptions", [
                "Unconfoundedness: Treatment assignment conditionally independent of potential outcomes given features.",
                "Positivity: All customer profiles had a non-zero probability of receiving treatment or control.",
                "SUTVA: No interference between customers and homogeneous treatment application."
            ]),
            evaluation_caveats=(
                "Evaluation caveat: Predictions represent mathematical treatment effect estimates from the trained ML model. "
                "Because baseline conversion rates in Criteo are very low (~0.28%), 95% bootstrap confidence intervals for incremental policy value "
                "include zero. Results should be validated in randomized A/B holdouts rather than interpreted as guaranteed causal certainty."
            )
        )

    @classmethod
    def get_sample_customer_payload(cls) -> List[Dict[str, Any]]:
        """Returns verified real records from criteo_sample_50000.csv for interactive UI testing."""
        data_file = PROJECT_ROOT / "data" / "marketing_instructions" / "criteo_sample_50000.csv"
        if data_file.exists():
            df = pd.read_csv(data_file)
            # Pick a rich sample of active and standard profiles for realistic demonstration
            active_df = df[(df["visit"] > 0) | (df["conversion"] > 0)].head(6)
            standard_df = df.head(4)
            combined = pd.concat([active_df, standard_df], ignore_index=True)
            records = []
            for idx, row in combined.iterrows():
                rec = {f: float(row[f]) for f in EXPECTED_FEATURES}
                rec["customer_id"] = f"CRITEO_CUST_{idx+1:03d}"
                records.append(rec)
            return records
        return []
