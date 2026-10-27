import unittest
import os
import hashlib
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.notebook_service import PROJECT_ROOT, assert_safe_path, assert_not_notebook
from fastapi import HTTPException

client = TestClient(app)

class TestCausalMarkSafety(unittest.TestCase):
    def test_notebooks_are_read_only_at_os_level(self):
        """Verify that every notebook in notebooks/ has OS write bit disabled"""
        nb_dir = PROJECT_ROOT / "notebooks"
        for nb in nb_dir.glob("*.ipynb"):
            self.assertFalse(os.access(nb, os.W_OK), f"Notebook {nb.name} must not be writable at OS level")

    def test_notebook_bytes_unchanged_on_read(self):
        """Reading a notebook through the API must not alter its bytes or timestamp"""
        nb_file = PROJECT_ROOT / "notebooks" / "01_Causal_Experiment_Engine.ipynb"
        with open(nb_file, "rb") as f:
            original_hash = hashlib.sha256(f.read()).hexdigest()
        
        response = client.get(f"/api/notebooks/{nb_file.name}")
        self.assertEqual(response.status_code, 200)
        
        with open(nb_file, "rb") as f:
            new_hash = hashlib.sha256(f.read()).hexdigest()
        self.assertEqual(original_hash, new_hash, "Notebook contents must remain strictly identical")

    def test_notebook_write_rejection_at_api(self):
        """API must reject write attempts on notebook paths"""
        response = client.post("/api/notebooks/01_Causal_Experiment_Engine.ipynb")
        self.assertEqual(response.status_code, 403)
        self.assertIn("strictly prohibited", response.json()["detail"])

    def test_path_traversal_rejection(self):
        """Path traversal outside project root must raise 403 or 404"""
        escape_path = PROJECT_ROOT / ".." / "some_file.txt"
        with self.assertRaises(HTTPException) as ctx:
            assert_safe_path(escape_path)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_health_endpoint(self):
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertIn("healthy", response.json()["status"])

    def test_project_overview(self):
        response = client.get("/api/project/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["read_only_protection"])
        self.assertFalse(data["causal_effect_verified"]) # Honest causal validation

    def test_uplift_summary_distinguishes_predictive_vs_causal(self):
        response = client.get("/api/uplift/summary")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["causal_effect_verified"])
        self.assertIn("Unverified", data["causal_status_label"])

if __name__ == "__main__":
    unittest.main()
