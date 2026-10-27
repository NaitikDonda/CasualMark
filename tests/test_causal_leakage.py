import unittest
from src.causalmark.causal.dag import CausalDAGValidator

class TestCausalLeakageAudit(unittest.TestCase):
    def test_pre_treatment_covariates_pass(self):
        criteo_features = [f"f{i}" for i in range(12)]
        res = CausalDAGValidator.audit_feature_matrix("criteo", criteo_features)
        self.assertTrue(res["is_causally_valid"])
        self.assertEqual(len(res["prohibited_features_found"]), 0)

    def test_post_treatment_visit_fails(self):
        corrupted_features = [f"f{i}" for i in range(10)] + ["visit"]
        res = CausalDAGValidator.audit_feature_matrix("criteo", corrupted_features)
        self.assertFalse(res["is_causally_valid"])
        self.assertIn("visit", res["prohibited_features_found"])

    def test_post_treatment_exposure_fails(self):
        corrupted_features = ["history", "mens", "exposure"]
        res = CausalDAGValidator.audit_feature_matrix("hillstrom", corrupted_features)
        self.assertFalse(res["is_causally_valid"])
        self.assertIn("exposure", res["prohibited_features_found"])

if __name__ == "__main__":
    unittest.main()
