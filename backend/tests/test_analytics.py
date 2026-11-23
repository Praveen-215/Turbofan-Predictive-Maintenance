import asyncio
import os
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.main import app
from backend.app.schemas.analytics import AnalyticsOverviewResponse, TestParityResponse
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.fleet_service import FleetService
from backend.app.services.inference_service import InferenceService


class TestAnalyticsEndpoints(unittest.TestCase):
    """
    Comprehensive test suite for Phase 3D Stage 2 Model Analytics API:
      1. Overview endpoint schema validation, metrics, and exact provenance.
      2. Test parity endpoint 100-engine verification, residual correctness, and precision.
      3. Ground truth isolation guarantees across the application.
      4. Concurrency safety, lock acquisition, and result caching.
      5. Failure modes, error handling, and zero partial return guarantees.
    """

    @classmethod
    def setUpClass(cls):
        # Configure writable Matplotlib cache directory inside sandbox to avoid startup warnings
        os.environ["MPLCONFIGDIR"] = "/tmp/matplotlib"

    # -----------------------------------------------------------------------
    # 1. Overview Endpoint Verification
    # -----------------------------------------------------------------------

    def test_overview_endpoint_returns_200_and_valid_schema(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            self.assertEqual(response.status_code, 200)

            data = response.json()
            # Validate against Pydantic schema
            parsed = AnalyticsOverviewResponse.model_validate(data)
            self.assertIsNotNone(parsed)

    def test_overview_dataset_protocol_and_disclaimer(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            data = response.json()["dataset_protocol"]

            self.assertEqual(data["dataset_name"], "NASA C-MAPSS FD001")
            self.assertEqual(data["training_engines"], 80)
            self.assertEqual(data["validation_engines"], 20)
            self.assertEqual(data["validation_sequences"], 3490)
            self.assertEqual(data["blind_test_engines"], 100)
            self.assertEqual(data["blind_test_sequences"], 100)
            self.assertEqual(data["window_size"], 30)
            self.assertEqual(data["feature_count"], 17)
            self.assertEqual(data["max_rul_cap"], 125)
            self.assertIn("Not certified for operational flight dispatch", data["disclaimer"])

    def test_overview_model_comparison_matrix(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            comp = response.json()["model_comparison"]

            self.assertEqual(len(comp["benchmark_models"]), 5)
            self.assertEqual(comp["selected_model_name"], "Stacked LSTM")

            models_by_name = {m["model_name"]: m for m in comp["benchmark_models"]}
            self.assertIn("Linear Regression", models_by_name)
            self.assertIn("Random Forest", models_by_name)
            self.assertIn("Stacked LSTM", models_by_name)
            self.assertIn("Stacked GRU", models_by_name)
            self.assertIn("1D-CNN", models_by_name)

            # Verify exact recorded benchmark metrics
            lr = models_by_name["Linear Regression"]
            self.assertAlmostEqual(lr["train_rmse"], 16.8713, places=4)
            self.assertAlmostEqual(lr["val_rmse"], 15.7605, places=4)
            self.assertAlmostEqual(lr["train_nasa"], 62440.46, places=2)
            self.assertAlmostEqual(lr["val_nasa"], 12653.03, places=2)
            self.assertAlmostEqual(lr["val_nasa_per_sample"], 3.6255, places=4)

            rf = models_by_name["Random Forest"]
            self.assertAlmostEqual(rf["train_rmse"], 7.5190, places=4)
            self.assertAlmostEqual(rf["val_rmse"], 16.0702, places=4)
            self.assertAlmostEqual(rf["train_nasa"], 12900.71, places=2)
            self.assertAlmostEqual(rf["val_nasa"], 17469.11, places=2)

            lstm = models_by_name["Stacked LSTM"]
            self.assertTrue(lstm["is_selected"])
            self.assertEqual(lstm["parameter_count"], 33953)
            self.assertAlmostEqual(lstm["train_rmse"], 11.1830, places=4)
            self.assertAlmostEqual(lstm["val_rmse"], 13.4770, places=4)
            self.assertAlmostEqual(lstm["train_nasa"], 27439.63, places=2)
            self.assertAlmostEqual(lstm["val_nasa"], 11396.72, places=2)
            self.assertAlmostEqual(lstm["val_nasa_per_sample"], 3.2655, places=4)

            gru = models_by_name["Stacked GRU"]
            self.assertFalse(gru["is_selected"])
            self.assertEqual(gru["parameter_count"], 25889)
            self.assertAlmostEqual(gru["train_rmse"], 13.2109, places=4)
            self.assertAlmostEqual(gru["val_rmse"], 12.8966, places=4)
            self.assertAlmostEqual(gru["val_nasa"], 12457.54, places=2)

            cnn = models_by_name["1D-CNN"]
            self.assertFalse(cnn["is_selected"])
            self.assertEqual(cnn["parameter_count"], 32193)
            self.assertAlmostEqual(cnn["train_rmse"], 16.2027, places=4)
            self.assertAlmostEqual(cnn["val_rmse"], 18.9131, places=4)
            self.assertAlmostEqual(cnn["val_nasa"], 33322.05, places=2)

    def test_overview_nasa_scoring_formula_and_asymmetry_interpretation(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            nasa = response.json()["nasa_scoring"]

            self.assertIn("d = predicted_RUL - actual_RUL", nasa["formula"])
            self.assertIn("exp(-d/13) - 1", nasa["formula"])
            self.assertIn("exp(d/10) - 1", nasa["formula"])
            self.assertIn("13", nasa["under_prediction_penalty"])
            self.assertIn("10", nasa["over_prediction_penalty"])
            # Verify explicit statement that over-prediction is penalized more steeply
            self.assertIn("Over-prediction is penalized more steeply", nasa["asymmetry_interpretation"])
            self.assertIn("10 < 13", nasa["asymmetry_interpretation"])

    def test_overview_lstm_and_cnn_architecture_details(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            lstm = response.json()["lstm_architecture"]
            cnn = response.json()["cnn_architecture"]

            # LSTM (33,953 parameters)
            self.assertEqual(lstm["total_parameters"], 33953)
            self.assertEqual(lstm["trainable_parameters"], 33953)
            self.assertEqual(lstm["non_trainable_parameters"], 0)
            lstm_layer_types = [layer["layer_type"] for layer in lstm["layers"]]
            self.assertEqual(
                lstm_layer_types,
                ["InputLayer", "LSTM", "Dropout", "LSTM", "Dropout", "Dense", "Dense"]
            )

            # 1D-CNN (32,193 parameters with GlobalAveragePooling1D)
            self.assertEqual(cnn["total_parameters"], 32193)
            self.assertEqual(cnn["trainable_parameters"], 32193)
            self.assertEqual(cnn["non_trainable_parameters"], 0)
            cnn_layer_types = [layer["layer_type"] for layer in cnn["layers"]]
            self.assertIn("GlobalAveragePooling1D", cnn_layer_types)
            self.assertNotIn("GlobalMaxPooling1D", cnn_layer_types)

    def test_overview_random_forest_hyperparameters(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            rf = response.json()["random_forest_hyperparameters"]

            self.assertEqual(rf["n_estimators"], 200)
            self.assertEqual(rf["max_features"], "sqrt")
            self.assertEqual(rf["min_samples_leaf"], 2)
            self.assertEqual(rf["random_state"], 42)
            self.assertEqual(rf["n_jobs"], -1)
            # max_depth must be None (scikit-learn default), NOT 15
            self.assertIsNone(rf["max_depth"])
            self.assertIn("scikit-learn library default of None", rf["parameter_specification_notes"])

    def test_overview_training_history_12_epochs(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            th = response.json()["training_history"]

            self.assertEqual(th["total_epochs"], 12)
            self.assertEqual(th["best_epoch"], 5)
            self.assertAlmostEqual(th["best_val_loss"], 181.6308, places=4)
            self.assertAlmostEqual(th["best_val_rmse"], 13.4770, places=4)
            self.assertTrue(th["early_stopping_triggered"])
            self.assertEqual(th["early_stopping_epoch"], 12)
            self.assertEqual(th["early_stopping_patience"], 7)
            self.assertEqual(th["weights_restored_from_epoch"], 5)

            epochs = th["epochs"]
            self.assertEqual(len(epochs), 12)
            # Check Epoch 1
            self.assertEqual(epochs[0]["epoch"], 1)
            self.assertAlmostEqual(epochs[0]["train_loss"], 6221.6006, places=4)
            self.assertAlmostEqual(epochs[0]["val_loss"], 3780.1099, places=4)
            # Check Best Epoch 5
            self.assertEqual(epochs[4]["epoch"], 5)
            self.assertAlmostEqual(epochs[4]["train_loss"], 208.5025, places=4)
            self.assertAlmostEqual(epochs[4]["val_loss"], 181.6308, places=4)
            self.assertAlmostEqual(epochs[4]["val_rmse"], 13.4770, places=4)
            # Check Final Epoch 12
            self.assertEqual(epochs[11]["epoch"], 12)
            self.assertAlmostEqual(epochs[11]["train_loss"], 110.0296, places=4)
            self.assertAlmostEqual(epochs[11]["val_loss"], 213.5625, places=4)

    def test_overview_artifact_provenance_exact_sizes(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            prov = response.json()["artifact_provenance"]

            self.assertEqual(prov["verification_status"], "VERIFIED_EXACT")
            artifacts_map = {a["filename"]: a for a in prov["artifacts"]}

            self.assertIn("stacked_lstm_fd001.keras", artifacts_map)
            self.assertEqual(artifacts_map["stacked_lstm_fd001.keras"]["size_bytes"], 449605)
            self.assertEqual(artifacts_map["stacked_lstm_fd001.keras"]["expected_size_bytes"], 449605)
            self.assertTrue(artifacts_map["stacked_lstm_fd001.keras"]["exists_on_disk"])

            self.assertIn("standard_scaler_fd001.pkl", artifacts_map)
            self.assertEqual(artifacts_map["standard_scaler_fd001.pkl"]["size_bytes"], 1423)

            self.assertIn("selected_features.json", artifacts_map)
            self.assertEqual(artifacts_map["selected_features.json"]["size_bytes"], 256)

            self.assertIn("model_metadata.json", artifacts_map)
            self.assertEqual(artifacts_map["model_metadata.json"]["size_bytes"], 1734)

    def test_overview_evaluation_summary_separation(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/overview")
            es = response.json()["evaluation_summary"]

            val = es["validation_metrics"]
            self.assertEqual(val["sample_count"], 3490)
            self.assertAlmostEqual(val["rmse"], 13.4770, places=4)
            self.assertAlmostEqual(val["nasa_total_score"], 11396.72, places=2)
            self.assertAlmostEqual(val["nasa_score_per_sample"], 3.2655, places=4)

            test = es["blind_test_metrics"]
            self.assertEqual(test["sample_count"], 100)
            self.assertAlmostEqual(test["rmse"], 15.1041, places=4)
            self.assertAlmostEqual(test["nasa_total_score"], 304.49, places=2)
            self.assertAlmostEqual(test["nasa_score_per_sample"], 3.0449, places=4)

            self.assertIn("distinct protocols", es["generalization_notes"])

    # -----------------------------------------------------------------------
    # 2. Test Parity Endpoint Verification
    # -----------------------------------------------------------------------

    def test_test_parity_returns_200_and_exact_100_records(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/test-parity")
            self.assertEqual(response.status_code, 200)

            data = response.json()
            parsed = TestParityResponse.model_validate(data)
            self.assertIsNotNone(parsed)

            self.assertEqual(data["engine_count"], 100)
            self.assertEqual(len(data["records"]), 100)

            # Verify unique engine IDs from 1 to 100
            engine_ids = [r["engine_id"] for r in data["records"]]
            self.assertEqual(engine_ids, list(range(1, 101)))
            self.assertEqual(len(set(engine_ids)), 100)

    def test_test_parity_residuals_and_finite_precision(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/test-parity")
            records = response.json()["records"]

            for r in records:
                self.assertTrue(np.isfinite(r["actual_rul"]))
                self.assertTrue(np.isfinite(r["predicted_rul"]))
                self.assertTrue(np.isfinite(r["residual"]))
                # Validate exact residual definition: residual = predicted - actual
                expected_residual = r["predicted_rul"] - r["actual_rul"]
                self.assertAlmostEqual(r["residual"], expected_residual, places=5)

    def test_test_parity_engine_to_rul_mapping_and_reproducibility(self):
        # Read raw ground-truth file directly to verify exact 1-to-1 alignment
        rul_path = settings.DATA_DIR / "RUL_FD001.txt"
        rul_lines = [float(l.strip()) for l in rul_path.read_text().splitlines() if l.strip()]

        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/test-parity")
            records = response.json()["records"]

            # Engine 1 check
            self.assertEqual(records[0]["engine_id"], 1)
            self.assertEqual(records[0]["actual_rul"], rul_lines[0])
            self.assertEqual(records[0]["actual_rul"], 112.0)

            # Engine 100 check
            self.assertEqual(records[99]["engine_id"], 100)
            self.assertEqual(records[99]["actual_rul"], rul_lines[99])
            self.assertEqual(records[99]["actual_rul"], 20.0)

            # Verify representative Engine 1 reproduction against direct InferenceService call
            flt_service = client.app.state.fleet_service
            inf_service = client.app.state.inference_service
            seq1 = flt_service.engines[1]["feature_matrix"][-30:].tolist()
            direct_pred1 = inf_service.predict_rul(seq1, inf_service.selected_features)

            self.assertAlmostEqual(records[0]["predicted_rul"], direct_pred1, places=5)

    def test_test_parity_summary_metrics(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/analytics/test-parity")
            summary = response.json()["summary"]

            self.assertEqual(summary["engine_count"], 100)
            self.assertAlmostEqual(summary["test_rmse"], 15.1041, places=3)
            self.assertAlmostEqual(summary["test_nasa_total"], 304.49, places=1)
            self.assertAlmostEqual(summary["test_nasa_per_engine"], 3.0449, places=3)

    # -----------------------------------------------------------------------
    # 3. Ground Truth Isolation Guarantee
    # -----------------------------------------------------------------------

    def test_ground_truth_strictly_isolated_from_fleet_and_predict_endpoints(self):
        with TestClient(app) as client:
            # Fleet Overview must never leak ground truth RUL
            r_fleet = client.get("/api/v1/fleet")
            self.assertEqual(r_fleet.status_code, 200)
            fleet_json = r_fleet.text.lower()
            self.assertNotIn("actual_rul", fleet_json)
            self.assertNotIn("ground_truth", fleet_json)

            # Engine Summary must never leak ground truth RUL
            r_summary = client.get("/api/v1/fleet/1")
            self.assertEqual(r_summary.status_code, 200)
            summary_json = r_summary.text.lower()
            self.assertNotIn("actual_rul", summary_json)
            self.assertNotIn("ground_truth", summary_json)

            # Telemetry replay must never leak ground truth RUL
            r_replay = client.get("/api/v1/fleet/1/replay?predict=true")
            self.assertEqual(r_replay.status_code, 200)
            replay_json = r_replay.text.lower()
            self.assertNotIn("actual_rul", replay_json)
            self.assertNotIn("ground_truth", replay_json)

            # FleetService internal dictionary must not contain RUL_FD001 ground truth
            fleet_service = client.app.state.fleet_service
            for engine_dict in fleet_service.engines.values():
                self.assertNotIn("actual_rul", engine_dict)
                self.assertNotIn("rul", engine_dict)

    # -----------------------------------------------------------------------
    # 4. Concurrency Safety and Caching
    # -----------------------------------------------------------------------

    def test_test_parity_result_is_cached_on_repeated_requests(self):
        with TestClient(app) as client:
            analytics_service = client.app.state.analytics_service
            self.assertIsNotNone(analytics_service)

            # Reset cache to ensure clean baseline
            analytics_service.clear_cache()
            self.assertIsNone(analytics_service._test_parity_cache)

            # First request computes and caches
            r1 = client.get("/api/v1/analytics/test-parity")
            self.assertEqual(r1.status_code, 200)
            self.assertIsNotNone(analytics_service._test_parity_cache)

            cached_ref = analytics_service._test_parity_cache

            # Second request must return identical cached object
            r2 = client.get("/api/v1/analytics/test-parity")
            self.assertEqual(r2.status_code, 200)
            self.assertIs(analytics_service._test_parity_cache, cached_ref)

    def test_concurrent_requests_use_lock_without_duplicate_inference(self):
        async def run_concurrent():
            # Initialize isolated services for direct async testing
            inf = InferenceService(
                settings.MODEL_PATH,
                settings.SCALER_PATH,
                settings.FEATURES_PATH,
                settings.METADATA_PATH,
            )
            inf.load_artifacts()

            flt = FleetService(settings.TEST_DATA_PATH, settings.FEATURES_PATH)
            flt.load_data()

            svc = AnalyticsService()
            svc.clear_cache()

            # Launch 5 concurrent calls to get_test_parity
            tasks = [svc.get_test_parity(inf, flt) for _ in range(5)]
            results = await asyncio.gather(*tasks)

            self.assertEqual(len(results), 5)
            # All 5 must return identical 100-record responses
            for res in results:
                self.assertEqual(res.engine_count, 100)
                self.assertEqual(len(res.records), 100)
                self.assertIs(res, results[0])

        asyncio.run(run_concurrent())

    # -----------------------------------------------------------------------
    # 5. Failure Handling and Zero Partial Returns
    # -----------------------------------------------------------------------

    def test_missing_ground_truth_raises_file_not_found_without_partial_return(self):
        async def run_failure():
            inf = InferenceService(
                settings.MODEL_PATH,
                settings.SCALER_PATH,
                settings.FEATURES_PATH,
                settings.METADATA_PATH,
            )
            inf.load_artifacts()

            flt = FleetService(settings.TEST_DATA_PATH, settings.FEATURES_PATH)
            flt.load_data()

            # Point to non-existent RUL file
            svc = AnalyticsService(rul_data_path=Path("/tmp/non_existent_rul_file.txt"))
            svc.clear_cache()

            with self.assertRaises(FileNotFoundError):
                await svc.get_test_parity(inf, flt)

            # Cache must remain empty
            self.assertIsNone(svc._test_parity_cache)

        asyncio.run(run_failure())

    def test_inference_failure_does_not_return_partial_results(self):
        async def run_inference_error():
            inf = InferenceService(
                settings.MODEL_PATH,
                settings.SCALER_PATH,
                settings.FEATURES_PATH,
                settings.METADATA_PATH,
            )
            inf.load_artifacts()

            flt = FleetService(settings.TEST_DATA_PATH, settings.FEATURES_PATH)
            flt.load_data()

            svc = AnalyticsService()
            svc.clear_cache()

            # Mock predict_rul to fail on Engine 10
            original_predict = inf.predict_rul
            call_count = 0

            def flaky_predict(seq, feature_names=None):
                nonlocal call_count
                call_count += 1
                if call_count == 10:
                    raise RuntimeError("Simulated inference hardware fault on engine 10")
                return original_predict(seq, feature_names)

            inf.predict_rul = flaky_predict

            with self.assertRaises(RuntimeError):
                await svc.get_test_parity(inf, flt)

            # Ensure cache was not partially populated with 9 records
            self.assertIsNone(svc._test_parity_cache)

        asyncio.run(run_inference_error())


if __name__ == "__main__":
    unittest.main()
