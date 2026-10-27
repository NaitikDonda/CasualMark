from typing import List, Dict, Any

class CausalDAGValidator:
    """
    Formally defines the Causal Directed Acyclic Graph (DAG) for CausalMark.
    Ensures pre-treatment covariates are separated from post-treatment mediators
    and collateral leakage variables.
    """
    
    # Pre-treatment covariates (valid for adjustment / CATE conditioning)
    VALID_PRE_TREATMENT_COVARIATES = {
        "criteo": [f"f{i}" for i in range(12)],
        "hillstrom": [
            "recency", "history", "mens", "womens", "zip_code", "newbie", "channel"
        ],
        "marketing_ab": ["user_id"] # strictly pre-randomization identifiers
    }

    # Prohibited post-treatment variables (mediators / colliders)
    PROHIBITED_POST_TREATMENT = {
        "visit": "Post-treatment mediator on the path T -> Visit -> Conversion. Conditioning induces collider bias.",
        "exposure": "Post-treatment exposure indicator. Conditioning blocks direct/indirect exposure mechanisms.",
        "spend": "Post-treatment outcome variable related to conversion value."
    }

    @classmethod
    def audit_feature_matrix(cls, dataset_name: str, feature_names: List[str]) -> Dict[str, Any]:
        """
        Audits candidate feature columns against the formal Causal DAG.
        Fails if any post-treatment mediator or collider is included in the adjustment set.
        """
        prohibited_detected = {}
        for col in feature_names:
            col_clean = col.lower().strip()
            if col_clean in cls.PROHIBITED_POST_TREATMENT:
                prohibited_detected[col] = cls.PROHIBITED_POST_TREATMENT[col_clean]

        is_valid = len(prohibited_detected) == 0
        return {
            "dataset": dataset_name,
            "total_features": len(feature_names),
            "is_causally_valid": is_valid,
            "prohibited_features_found": prohibited_detected,
            "audit_message": "Pass: Covariates are strictly pre-treatment." if is_valid else f"Fail: Post-treatment leakage detected: {list(prohibited_detected.keys())}"
        }

    @classmethod
    def get_dag_specification(cls) -> str:
        """
        Returns a text-based ASCII representation of the causal DAG.
        """
        return """
        CausalMark Marketing Experiment DAG:
        
            [Pre-treatment Covariates X] ──────────┐
                   │                                │
                   ▼                                ▼
            [Treatment T] ───(Indirect Path)───> [Visit M] ───> [Conversion Y]
                   │                                             ▲
                   └────────────(Direct Path)────────────────────┘
                   
        Identification Rule:
        - Total Treatment Effect (ATE / CATE): Regress Y on T conditioning on X ONLY.
        - Conditioning on Mediator M ('visit') BLOCKS the indirect causal effect and introduces collider bias if unobserved confounders U affect (M, Y).
        """
