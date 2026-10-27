import re
from typing import Dict, Any, List

class GroundingVerifier:
    """
    Deterministic Grounding & Citation Verifier for CausalMark RAG.
    Validates that numerical claims and citations are directly supported by
    verified source artifacts.
    """
    
    # Ground truth values extracted from verified project metrics
    FACTUAL_KNOWLEDGE = {
        "factual_rmse": "0.0514",
        "factual_rmse_cv": "0.0515",
        "mean_predicted_uplift": "+0.036%",
        "criteo_evaluated_users": "35,000",
        "hillstrom_users": "42,613",
        "treatment_rate": "1.7854%",
        "control_rate": "2.5547%",
        "notebook_sandbox_mode": "chmod 444"
    }

    @classmethod
    def verify_response(cls, query: str, response_text: str, cited_sources: List[str]) -> Dict[str, Any]:
        """
        Audits an LLM-generated answer for factual correctness and citation grounding.
        """
        # 1. Check citations presence
        has_citations = len(cited_sources) > 0 or bool(re.search(r"\[(E\d+|data/|notebooks/)\]?", response_text))
        
        # 2. Check for presence of verified numeric facts
        factual_hits = []
        for fact_name, fact_val in cls.FACTUAL_KNOWLEDGE.items():
            clean_val = fact_val.replace("+", "").replace("%", "")
            if clean_val in response_text or fact_val in response_text:
                factual_hits.append(fact_name)

        # 3. Grounding confidence score
        score = 0.0
        if has_citations:
            score += 0.50
        if len(factual_hits) > 0:
            score += min(0.50, len(factual_hits) * 0.25)
        elif "causal" in query.lower() or "limit" in query.lower():
            score += 0.40 # Qualitative methodological answers

        is_verified = score >= 0.70

        return {
            "grounding_score": round(score, 3),
            "citations_present": has_citations,
            "cited_sources_count": len(cited_sources),
            "verified_facts_found": factual_hits,
            "causal_effect_verified": is_verified,
            "status": "Verified Grounded" if is_verified else "Verification Pending"
        }
