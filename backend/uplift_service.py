import os
import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from backend.notebook_service import PROJECT_ROOT

class UpliftService:
    @staticmethod
    def get_uplift_summary() -> Dict[str, Any]:
        """Load real Criteo and CausalMark uplift evaluation metrics"""
        eval_dir = PROJECT_ROOT / "data" / "evaluation"
        
        # 1. Summary status
        summary_file = eval_dir / "criteo_uplift_final_summary.json"
        summary_data = {}
        if summary_file.exists():
            with open(summary_file, "r") as f:
                summary_data = json.load(f)
                
        # 2. Final model metrics
        metrics_file = eval_dir / "causalmark_final_model_metrics.csv"
        metrics_dict = {}
        if metrics_file.exists():
            df_m = pd.read_csv(metrics_file)
            metrics_dict = dict(zip(df_m["Metric"], df_m["Value"]))

        # 3. Model evaluation & CV
        model_eval_file = eval_dir / "criteo_model_evaluation.json"
        model_eval_data = {}
        if model_eval_file.exists():
            with open(model_eval_file, "r") as f:
                model_eval_data = json.load(f)

        return {
            "summary": summary_data,
            "metrics": metrics_dict,
            "cross_validation": model_eval_data.get("cross_validation", {}),
            "interpretation_notes": model_eval_data.get("interpretation_notes", []),
            "causal_effect_verified": False,
            "causal_status_label": "Unverified (Predictive Lift Available, Causal Identification Pending)"
        }

    @staticmethod
    def get_deciles() -> List[Dict[str, Any]]:
        deciles_file = PROJECT_ROOT / "data" / "evaluation" / "criteo_uplift_decile_summary.csv"
        if not deciles_file.exists():
            return []
        df = pd.read_csv(deciles_file)
        return df.to_dict(orient="records")

    @staticmethod
    def get_strategies() -> List[Dict[str, Any]]:
        strat_file = PROJECT_ROOT / "data" / "evaluation" / "criteo_uplift_strategy_comparison.csv"
        if not strat_file.exists():
            return []
        df = pd.read_csv(strat_file)
        return df.to_dict(orient="records")

    @staticmethod
    def get_observed_conversion_by_decile() -> List[Dict[str, Any]]:
        obs_file = PROJECT_ROOT / "data" / "evaluation" / "criteo_observed_conversion_by_decile.csv"
        if not obs_file.exists():
            return []
        df = pd.read_csv(obs_file)
        return df.to_dict(orient="records")
