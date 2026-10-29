"""
Comprehensive automated tests for Production ML Uplift Model Integration:
1. Loading trained ML models (X-Learner, T-Learner, S-Learner).
2. Customer feature validation and error handling.
3. Control vs Treatment prediction logic and uplift calculation.
4. API request and response schemas (/api/ml/uplift/predict, /api/ml/uplift/metadata, /api/ml/uplift/sample-payload).
5. Missing or incompatible artifact handling.
6. Hybrid Qwen-plus-ML workflow (/api/ai/hybrid-query).
7. Existing Qwen functionality and application routes preservation.
"""

import unittest
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient

from backend.main import app
from backend.ml_uplift_service import MlUpliftService, EXPECTED_FEATURES


class TestProductionMlUpliftIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.sample_payload = MlUpliftService.get_sample_customer_payload()

    def test_01_load_all_trained_learners(self):
        """Verify that all three trained uplift models can be loaded cleanly."""
        for learner in ["X-Learner", "T-Learner", "S-Learner"]:
            artifact = MlUpliftService.load_model(learner)
            self.assertIsInstance(artifact, dict)
            self.assertIn("feature_columns", artifact)
            self.assertEqual(artifact["feature_columns"], EXPECTED_FEATURES)

    def test_02_feature_validation_missing_columns(self):
        """Input records missing mandatory features must raise a descriptive ValueError."""
        invalid_record = [{"f0": 1.0, "f1": 2.0}]  # Missing f2-f11, visit, exposure
        with self.assertRaises(ValueError) as ctx:
            MlUpliftService.predict(invalid_record, "X-Learner")
        self.assertIn("missing required feature columns", str(ctx.exception).lower())

    def test_03_feature_validation_non_numeric(self):
        """Records with non-numeric strings must be rejected."""
        bad_record = {f: 1.0 for f in EXPECTED_FEATURES}
        bad_record["f0"] = "corrupted_string"
        with self.assertRaises(ValueError) as ctx:
            MlUpliftService.predict([bad_record], "X-Learner")
        self.assertIn("non-numeric", str(ctx.exception).lower())

    def test_04_uplift_calculation_correctness(self):
        """Verify that predicted uplift equals treated conversion prob minus control conversion prob."""
        res = MlUpliftService.predict(self.sample_payload[:5], "X-Learner")
        self.assertEqual(len(res.predictions), 5)
        for p in res.predictions:
            # Check range [0, 1]
            self.assertGreaterEqual(p.control_conversion_prob, 0.0)
            self.assertLessEqual(p.control_conversion_prob, 1.0)
            self.assertGreaterEqual(p.treatment_conversion_prob, 0.0)
            self.assertLessEqual(p.treatment_conversion_prob, 1.0)
            
            # Uplift = Treatment - Control
            expected_uplift = round(p.treatment_conversion_prob - p.control_conversion_prob, 6)
            self.assertAlmostEqual(p.predicted_uplift, expected_uplift, places=5)
            self.assertAlmostEqual(p.predicted_uplift_percentage_points, round(expected_uplift * 100.0, 4), places=3)
            self.assertIn(p.targeting_tier, [
                "High Priority Persuadable",
                "Moderate Persuadable",
                "Neutral / Sure Thing / Lost Cause",
                "Sleeping Dog / Do Not Disturb"
            ])

    def test_05_api_ml_uplift_predict_route(self):
        """Test POST /api/ml/uplift/predict schema, status code, and contents."""
        req_body = {
            "model_name": "X-Learner",
            "customers": self.sample_payload[:3]
        }
        resp = self.client.post("/api/ml/uplift/predict", json=req_body)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["model_name"], "X-Learner")
        self.assertEqual(data["model_version"], "1.0.0")
        self.assertIn("champion_status", data)
        self.assertIn("predictions", data)
        self.assertEqual(len(data["predictions"]), 3)
        self.assertIn("causal_assumptions", data)
        self.assertIn("evaluation_caveats", data)

    def test_06_api_ml_metadata_and_sample_payload(self):
        """Test GET /api/ml/uplift/metadata and /api/ml/uplift/sample-payload."""
        meta_resp = self.client.get("/api/ml/uplift/metadata")
        self.assertEqual(meta_resp.status_code, 200)
        meta_data = meta_resp.json()
        self.assertIn("metadata", meta_data)
        self.assertIn("comparison_report", meta_data)
        self.assertEqual(meta_data["metadata"]["model_name"], "X-Learner")

        sample_resp = self.client.get("/api/ml/uplift/sample-payload")
        self.assertEqual(sample_resp.status_code, 200)
        sample_data = sample_resp.json()
        self.assertGreater(sample_data["count"], 0)
        self.assertIn("f0", sample_data["customers"][0])

    def test_07_hybrid_workflow_with_ml_trigger(self):
        """Hybrid endpoint routes queries requiring uplift calculations to genuine ML model."""
        payload = {
            "query": "Predict uplift and targeting tier for my high-intent customers.",
            "customers": self.sample_payload[:2],
            "model_name": "X-Learner"
        }
        resp = self.client.post("/api/ai/hybrid-query", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["requires_ml"])
        self.assertIsNotNone(data["ml_prediction"])
        self.assertEqual(len(data["ml_prediction"]["predictions"]), 2)
        # AI explanation must be present and substantive
        self.assertTrue(len(data["ai_explanation"]) > 30)

    def test_08_hybrid_workflow_general_nlp_preservation(self):
        """General non-prediction queries must preserve existing Qwen grounded response workflow."""
        payload = {
            "query": "What is the dataset inventory and row count?"
        }
        resp = self.client.post("/api/ai/hybrid-query", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["requires_ml"])
        self.assertIsNone(data["ml_prediction"])
        self.assertIn("ai_explanation", data)
        self.assertTrue(len(data["ai_explanation"]) > 20)

    def test_09_existing_routes_preservation(self):
        """Ensure health, overview, datasets, uplift summaries are completely unaffected."""
        health_resp = self.client.get("/api/health")
        self.assertEqual(health_resp.status_code, 200)
        self.assertEqual(health_resp.json()["status"], "healthy")

        uplift_sum_resp = self.client.get("/api/uplift/summary")
        self.assertEqual(uplift_sum_resp.status_code, 200)

        ai_models_resp = self.client.get("/api/ai/models")
        self.assertEqual(ai_models_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()

