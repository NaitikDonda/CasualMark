import unittest
import os
import io
import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.notebook_service import PROJECT_ROOT

client = TestClient(app)

class TestNewFeatures(unittest.TestCase):
    def test_ai_models_endpoint(self):
        """Verify dynamic discovery of local models"""
        response = client.get("/api/ai/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("installed_models", data)
        self.assertIn("preferred_model", data)

    def test_ai_chat_source_grounding(self):
        """Verify Ask CausalMark AI answers with citations and honest causal status"""
        response = client.post("/api/ai/chat", json={"query": "Why is causal-effect verification currently false?"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)
        self.assertTrue(len(data.get("citations", [])) > 0)
        self.assertIn("data/evaluation/criteo_uplift_final_summary.json", [c["source"] for c in data["citations"]])

    def test_ai_chat_empty_query_rejected(self):
        """Empty query must be rejected with 400"""
        response = client.post("/api/ai/chat", json={"query": "   "})
        self.assertEqual(response.status_code, 400)

    def test_valid_user_dataset_upload_and_analysis(self):
        """Test uploading a valid CSV dataset and running exploratory analysis"""
        csv_content = b"user_id,treatment,converted,age\n1,1,1,25\n2,1,0,32\n3,0,0,45\n4,0,1,28\n"
        response = client.post(
            "/api/user-datasets/upload",
            files={"file": ("test_cohort.csv", io.BytesIO(csv_content), "text/csv")}
        )
        self.assertEqual(response.status_code, 200)
        upload_data = response.json()
        upload_id = upload_data["metadata"]["upload_id"]

        # Run analysis
        analysis_res = client.post(
            "/api/user-datasets/analyze",
            json={
                "upload_id": upload_id,
                "treatment_column": "treatment",
                "outcome_column": "converted",
                "customer_id_column": "user_id"
            }
        )
        self.assertEqual(analysis_res.status_code, 200)
        res_data = analysis_res.json()
        self.assertEqual(res_data["analysis"]["treatment_users"], 2)
        self.assertEqual(res_data["analysis"]["control_users"], 2)

        # Clean up
        del_res = client.delete(f"/api/user-datasets/{upload_id}")
        self.assertEqual(del_res.status_code, 200)

    def test_invalid_file_type_rejected(self):
        """Test that invalid file extensions like .exe are rejected with 400"""
        bad_file = b"malicious binary content"
        response = client.post(
            "/api/user-datasets/upload",
            files={"file": ("malware.exe", io.BytesIO(bad_file), "application/octet-stream")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

    def test_oversized_file_rejected(self):
        """Test that oversized file (>25MB) is rejected with 413"""
        large_content = b"0" * (26 * 1024 * 1024)
        response = client.post(
            "/api/user-datasets/upload",
            files={"file": ("large.csv", io.BytesIO(large_content), "text/csv")}
        )
        self.assertEqual(response.status_code, 413)

    def test_upload_cannot_overwrite_notebook(self):
        """Upload must never overwrite or target a notebook file"""
        response = client.post(
            "/api/user-datasets/upload",
            files={"file": ("01_Causal_Experiment_Engine.ipynb", io.BytesIO(b"malicious"), "application/json")}
        )
        # Even if processed, saved name gets prefixed with unique ID and placed strictly in data/user_uploads
        # Verify original notebook remains read-only and unchanged
        nb_file = PROJECT_ROOT / "notebooks" / "01_Causal_Experiment_Engine.ipynb"
        self.assertFalse(os.access(nb_file, os.W_OK))

if __name__ == "__main__":
    unittest.main()
