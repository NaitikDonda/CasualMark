import unittest
from src.causalmark.rag.grounding import GroundingVerifier

class TestRagGrounding(unittest.TestCase):
    def test_well_grounded_response_passes(self):
        query = "What is the factual RMSE on the Criteo benchmark?"
        response = "According to [data/evaluation/criteo_final_metrics.csv], the factual RMSE is 0.0514 with a CV mean of 0.0515 across 5 folds."
        sources = ["data/evaluation/criteo_final_metrics.csv"]
        
        result = GroundingVerifier.verify_response(query, response, sources)
        self.assertTrue(result["causal_effect_verified"])
        self.assertGreaterEqual(result["grounding_score"], 0.70)
        self.assertIn("factual_rmse", result["verified_facts_found"])

    def test_unsupported_response_fails(self):
        query = "What is our lift?"
        response = "Our marketing strategy produced a huge 99% conversion boost."
        sources = []
        
        result = GroundingVerifier.verify_response(query, response, sources)
        self.assertFalse(result["causal_effect_verified"])
        self.assertLess(result["grounding_score"], 0.70)

if __name__ == "__main__":
    unittest.main()
