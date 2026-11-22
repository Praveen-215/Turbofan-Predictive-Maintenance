import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.inference_service import InferenceService

class TestInferencePipeline(unittest.TestCase):
    """
    Comprehensive test suite for InferenceService and prediction endpoint:
      1. Artifact path resolution from any directory
      2. Valid 30x17 input predictions
      3. Feature order mismatch rejection
      4. Invalid sequence length rejection
      5. Invalid feature count rejection
      6. NaN and infinity rejection
      7. Error masking without leaking internal paths
      8. Numerical parity against Test Engine 1 reference from Notebook 12
    """

    @classmethod
    def setUpClass(cls):
        cls.service = InferenceService(
            model_path=settings.MODEL_PATH,
            scaler_path=settings.SCALER_PATH,
            features_path=settings.FEATURES_PATH,
            metadata_path=settings.METADATA_PATH,
        )
        cls.service.load_artifacts()

    def test_artifacts_loaded_successfully(self):
        self.assertTrue(self.service.is_loaded)
        self.assertIsNotNone(self.service.model)
        self.assertIsNotNone(self.service.scaler)
        self.assertEqual(len(self.service.selected_features), 17)

    def test_valid_input_produces_finite_prediction(self):
        # Generate dummy 30x17 sequence
        dummy_seq = [[100.0 + i for i in range(17)] for _ in range(30)]
        pred = self.service.predict_rul(dummy_seq, feature_names=self.service.selected_features)
        self.assertIsInstance(pred, float)
        self.assertTrue(np.isfinite(pred))

    def test_feature_names_mismatch_raises_error(self):
        dummy_seq = [[1.0] * 17 for _ in range(30)]
        # Swapped feature order
        swapped_features = list(self.service.selected_features)
        swapped_features[0], swapped_features[1] = swapped_features[1], swapped_features[0]

        with self.assertRaises(ValueError) as ctx:
            self.service.predict_rul(dummy_seq, feature_names=swapped_features)
        self.assertIn("Feature names or ordering mismatch", str(ctx.exception))

    def test_invalid_sequence_length_raises_error(self):
        # 29 cycles instead of 30
        short_seq = [[1.0] * 17 for _ in range(29)]
        with self.assertRaises(ValueError):
            self.service.predict_rul(short_seq, feature_names=self.service.selected_features)

        # 31 cycles instead of 30
        long_seq = [[1.0] * 17 for _ in range(31)]
        with self.assertRaises(ValueError):
            self.service.predict_rul(long_seq, feature_names=self.service.selected_features)

    def test_invalid_feature_count_raises_error(self):
        # 30 cycles with 16 features
        few_features = [[1.0] * 16 for _ in range(30)]
        with self.assertRaises(ValueError):
            self.service.predict_rul(few_features)

        # 30 cycles with 18 features
        many_features = [[1.0] * 18 for _ in range(30)]
        with self.assertRaises(ValueError):
            self.service.predict_rul(many_features)

    def test_nan_values_rejected(self):
        nan_seq = [[1.0] * 17 for _ in range(30)]
        nan_seq[10][5] = float("nan")
        with self.assertRaises(ValueError):
            self.service.predict_rul(nan_seq, feature_names=self.service.selected_features)

    def test_infinity_values_rejected(self):
        inf_seq = [[1.0] * 17 for _ in range(30)]
        inf_seq[15][2] = float("inf")
        with self.assertRaises(ValueError):
            self.service.predict_rul(inf_seq, feature_names=self.service.selected_features)

    def test_predict_endpoint_via_testclient(self):
        with TestClient(app) as client:
            dummy_seq = [[50.0 + i for i in range(17)] for _ in range(30)]
            payload = {
                "feature_names": self.service.selected_features,
                "sequence": dummy_seq
            }
            response = client.post("/api/v1/predict", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["unit"], "cycles")
            self.assertEqual(data["sequence_length"], 30)
            self.assertEqual(data["feature_count"], 17)
            self.assertTrue(np.isfinite(data["predicted_rul"]))

    def test_predict_endpoint_rejects_feature_names_mismatch(self):
        with TestClient(app) as client:
            dummy_seq = [[1.0] * 17 for _ in range(30)]
            swapped_features = list(self.service.selected_features)
            swapped_features[0], swapped_features[1] = swapped_features[1], swapped_features[0]
            payload = {
                "feature_names": swapped_features,
                "sequence": dummy_seq
            }
            resp = client.post("/api/v1/predict", json=payload)
            self.assertEqual(resp.status_code, 400)
            self.assertIn("Feature names or ordering mismatch", resp.json()["detail"])

    def test_predict_endpoint_rejects_malformed_payload(self):
        with TestClient(app) as client:
            # Empty sequence
            resp = client.post("/api/v1/predict", json={"feature_names": self.service.selected_features, "sequence": []})
            self.assertEqual(resp.status_code, 422)

            # Short sequence (10 cycles)
            resp = client.post("/api/v1/predict", json={"feature_names": self.service.selected_features, "sequence": [[1.0] * 17 for _ in range(10)]})
            self.assertEqual(resp.status_code, 422)

            # Wrong feature_names count (5 names)
            resp = client.post("/api/v1/predict", json={"feature_names": ["sensor_2"] * 5, "sequence": [[1.0] * 17 for _ in range(30)]})
            self.assertEqual(resp.status_code, 422)

    def test_unexpected_inference_error_is_masked(self):
        """Verifies that internal unexpected exceptions return generic 500 without leaking stack traces or paths."""
        with TestClient(app) as client:
            dummy_seq = [[1.0] * 17 for _ in range(30)]
            payload = {
                "feature_names": self.service.selected_features,
                "sequence": dummy_seq
            }
            # Simulate unexpected internal failure in model callable
            with patch.object(app.state.inference_service, "predict_rul", side_effect=RuntimeError("/var/internal/sensitive_path.py line 42 failed")):
                resp = client.post("/api/v1/predict", json=payload)
                self.assertEqual(resp.status_code, 500)
                detail = resp.json()["detail"]
                self.assertEqual(detail, "Internal inference evaluation error. Please review server logs.")
                self.assertNotIn("/var/internal", detail)
                self.assertNotIn("sensitive_path", detail)

    def test_inference_parity_against_notebook_12_test_engine_1(self):
        """
        Extracts the exact final 30-cycle telemetry window of Test Engine 1 from test_FD001.txt,
        runs it through the InferenceService, and compares against the evaluated prediction
        from Notebook 12.
        """
        raw_test_file = settings.BASE_DIR / "data" / "raw" / "CMaps" / "test_FD001.txt"
        columns = ["unit", "cycle"] + [f"op_setting_{i}" for i in range(1, 4)] + [f"sensor_{i}" for i in range(1, 22)]
        test_df = pd.read_csv(raw_test_file, sep=r"\s+", header=None, names=columns)

        unit1_df = test_df[test_df["unit"] == 1].sort_values("cycle").reset_index(drop=True)
        unit1_window = unit1_df[self.service.selected_features].values[-30:].tolist()

        predicted_rul = self.service.predict_rul(unit1_window, feature_names=self.service.selected_features)

        # Expected prediction from Notebook 12 test evaluation: 120.9386 cycles
        expected_pred = 120.93856048583984
        self.assertAlmostEqual(predicted_rul, expected_pred, places=4)
        print(f"\n[PARITY CHECK] Test Unit 1 RUL: Service = {predicted_rul:.4f}, Expected = {expected_pred:.4f} -> Exact match verified!")

if __name__ == "__main__":
    unittest.main()
