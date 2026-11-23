import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestHealthEndpoint(unittest.TestCase):
    """Verifies the health check endpoint and startup artifact loading."""

    def test_health_check_returns_200_and_readiness(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "healthy")
            self.assertTrue(data["model_loaded"])
            self.assertTrue(data["scaler_loaded"])
            self.assertTrue(data["features_loaded"])
            self.assertEqual(data["features_count"], 17)
            self.assertEqual(data["input_shape"], [30, 17])
            self.assertEqual(data["model_name"], "Stacked LSTM Network")
            self.assertIn("architecture", data["metadata"])

    def test_root_endpoint_returns_service_info(self):
        with TestClient(app) as client:
            response = client.get("/")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("TURBOGUARD AI", data["service"])
            self.assertEqual(data["documentation"], "/docs")

if __name__ == "__main__":
    unittest.main()
