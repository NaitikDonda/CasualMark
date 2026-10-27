import unittest
import os
import io
import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.user_data_service import UserDataService, PROJECT_ROOT

client = TestClient(app)

class TestDatasetIntegration(unittest.TestCase):
    def test_active_dataset_default_and_selection(self):
        """Test getting and switching the active dataset between benchmark and user upload"""
        # 1. Reset to benchmark
        client.post("/api/active-dataset/select", json={"dataset_id": "criteo_benchmark"})
        res = client.get("/api/active-dataset")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_benchmark"])
        self.assertEqual(data["active_id"], "criteo_benchmark")
        self.assertEqual(data["evaluated_users"], 35000)

        # 2. Check overview reflects benchmark
        ov = client.get("/api/project/overview").json()
        self.assertTrue(ov["is_benchmark"])
        self.assertIn("Factual RMSE", ov["latest_metrics"])

    def test_marketing_ab_calculations(self):
        """Test exact calculation on marketing_AB.csv: ad vs psa"""
        # Upload marketing_AB CSV content
        csv_sample = (
            "user_id,test group,converted\n"
            "1,ad,True\n"
            "2,ad,False\n"
            "3,ad,True\n"
            "4,ad,False\n"
            "5,psa,True\n"
            "6,psa,False\n"
            "7,psa,False\n"
            "8,psa,False\n"
        )
        up_res = client.post(
            "/api/user-datasets/upload",
            files={"file": ("mini_marketing_AB.csv", io.BytesIO(csv_sample.encode("utf-8")), "text/csv")}
        )
        self.assertEqual(up_res.status_code, 200)
        upload_id = up_res.json()["metadata"]["upload_id"]

        # Run analysis mapping treatment=ad, control=psa
        an_res = client.post(
            "/api/user-datasets/analyze",
            json={
                "upload_id": upload_id,
                "treatment_column": "test group",
                "outcome_column": "converted",
                "treatment_val": "ad",
                "control_val": "psa"
            }
        )
        self.assertEqual(an_res.status_code, 200)
        res_data = an_res.json()
        analysis = res_data["analysis"]

        # Check group mapping and sizes
        self.assertEqual(res_data["treatment_label"], "ad")
        self.assertEqual(res_data["control_label"], "psa")
        self.assertEqual(analysis["treatment_users"], 4)
        self.assertEqual(analysis["treatment_conversions"], 2)
        self.assertEqual(analysis["treatment_rate_pct"], 50.0)

        self.assertEqual(analysis["control_users"], 4)
        self.assertEqual(analysis["control_conversions"], 1)
        self.assertEqual(analysis["control_rate_pct"], 25.0)

        self.assertEqual(analysis["absolute_lift_pp"], 25.0)
        self.assertEqual(analysis["relative_lift_pct"], 100.0)

        # Verify active dataset was automatically set to this upload
        act_res = client.get("/api/active-dataset").json()
        self.assertEqual(act_res["active_id"], upload_id)
        self.assertFalse(act_res["is_benchmark"])
        self.assertFalse(act_res["has_model_deciles"])

        # Clean up
        client.delete(f"/api/user-datasets/{upload_id}")

    def test_invalid_and_missing_columns(self):
        """Non-existent treatment or outcome column must return 400"""
        csv_sample = b"a,b\n1,0\n"
        up_res = client.post(
            "/api/user-datasets/upload",
            files={"file": ("dummy.csv", io.BytesIO(csv_sample), "text/csv")}
        )
        upload_id = up_res.json()["metadata"]["upload_id"]

        bad_res = client.post(
            "/api/user-datasets/analyze",
            json={
                "upload_id": upload_id,
                "treatment_column": "non_existent_column",
                "outcome_column": "b"
            }
        )
        self.assertEqual(bad_res.status_code, 400)
        client.delete(f"/api/user-datasets/{upload_id}")

    def test_ambiguous_outcome_rejected(self):
        """Outcome with non-binary string categories must be rejected"""
        csv_sample = b"treatment,outcome\nad,red\nad,blue\npsa,yellow\n"
        up_res = client.post(
            "/api/user-datasets/upload",
            files={"file": ("colors.csv", io.BytesIO(csv_sample), "text/csv")}
        )
        upload_id = up_res.json()["metadata"]["upload_id"]

        bad_res = client.post(
            "/api/user-datasets/analyze",
            json={
                "upload_id": upload_id,
                "treatment_column": "treatment",
                "outcome_column": "outcome"
            }
        )
        self.assertEqual(bad_res.status_code, 400)
        self.assertIn("Ambiguous outcome encoding", bad_res.json()["detail"])
        client.delete(f"/api/user-datasets/{upload_id}")

if __name__ == "__main__":
    unittest.main()
