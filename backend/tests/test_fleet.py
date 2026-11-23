import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestFleetManagement(unittest.TestCase):
    """
    Comprehensive test suite for FleetService and Fleet API endpoints:
      1. Fleet overview loads exactly 100 engines.
      2. Correct per-engine cycle counts (min 31, max 303, total 13,096).
      3. Chronological telemetry ordering.
      4. Correct 17-feature order.
      5. Individual engine summary.
      6. Telemetry range filtering.
      7. Invalid engine ID returns 404.
      8. Invalid cycle range returns 400.
      9. Valid 30-cycle replay window.
      10. Replay with prediction integration.
      11. Insufficient history returns 400.
      12. Strict isolation: zero ground-truth RUL leakage.
      13. CORS preflight OPTIONS check.
    """

    @classmethod
    def setUpClass(cls):
        # Enter FastAPI lifespan context to initialize services
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_fleet_loads_exactly_100_engines(self):
        resp = self.client.get("/api/v1/fleet")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_engines"], 100)
        self.assertEqual(len(data["engine_ids"]), 100)
        self.assertEqual(data["engine_ids"], list(range(1, 101)))
        self.assertEqual(data["total_telemetry_records"], 13096)
        self.assertEqual(data["prediction_ready_count"], 100)

    def test_correct_per_engine_cycle_counts(self):
        resp = self.client.get("/api/v1/fleet")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        per_engine = data["per_engine_cycles"]
        # Unit 1 has 31 cycles, Unit 49 has 303 cycles
        self.assertEqual(per_engine["1"], 31)
        self.assertEqual(per_engine["49"], 303)
        self.assertEqual(sum(per_engine.values()), 13096)

    def test_chronological_telemetry_ordering(self):
        resp = self.client.get("/api/v1/fleet/1/telemetry")
        self.assertEqual(resp.status_code, 200)
        telemetry = resp.json()["telemetry"]
        cycles = [r["cycle"] for r in telemetry]
        self.assertEqual(cycles, list(range(1, 32)))
        self.assertTrue(all(x < y for x, y in zip(cycles, cycles[1:])))

    def test_correct_feature_order(self):
        resp = self.client.get("/api/v1/fleet")
        self.assertEqual(resp.status_code, 200)
        features = resp.json()["features"]
        self.assertEqual(len(features), 17)
        self.assertEqual(features[0], "op_setting_1")
        self.assertEqual(features[1], "op_setting_2")
        self.assertIn("sensor_6", features)
        self.assertEqual(features[-1], "sensor_21")

    def test_engine_summary(self):
        resp = self.client.get("/api/v1/fleet/1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["engine_id"], 1)
        self.assertEqual(data["total_cycles"], 31)
        self.assertEqual(data["first_cycle"], 1)
        self.assertEqual(data["last_cycle"], 31)
        self.assertTrue(data["has_sufficient_history"])
        self.assertEqual(len(data["latest_sensor_readings"]), 17)

    def test_valid_telemetry_range(self):
        resp = self.client.get("/api/v1/fleet/1/telemetry?start_cycle=5&end_cycle=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["record_count"], 6)
        self.assertEqual(data["start_cycle"], 5)
        self.assertEqual(data["end_cycle"], 10)
        cycles = [r["cycle"] for r in data["telemetry"]]
        self.assertEqual(cycles, [5, 6, 7, 8, 9, 10])

    def test_invalid_engine_id_returns_404(self):
        resp_999 = self.client.get("/api/v1/fleet/999")
        self.assertEqual(resp_999.status_code, 404)
        self.assertIn("not found in fleet", resp_999.json()["detail"])

        resp_0 = self.client.get("/api/v1/fleet/0")
        self.assertEqual(resp_0.status_code, 404)

    def test_invalid_cycle_range_returns_400(self):
        resp = self.client.get("/api/v1/fleet/1/telemetry?start_cycle=20&end_cycle=10")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot be greater than end_cycle", resp.json()["detail"])

    def test_valid_30_cycle_replay_window(self):
        # Unit 1 has cycles 1..31. Default replay window ends at last cycle (31) -> cycles 2..31
        resp = self.client.get("/api/v1/fleet/1/replay")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["engine_id"], 1)
        self.assertEqual(data["start_cycle"], 2)
        self.assertEqual(data["end_cycle"], 31)
        self.assertEqual(data["window_length"], 30)
        self.assertEqual(len(data["sequence"]), 30)
        self.assertEqual(len(data["sequence"][0]), 17)
        self.assertIsNone(data["predicted_rul"])
        self.assertIn("Demonstration/replay", data["disclaimer"])

    def test_replay_with_prediction_integration(self):
        # Unit 1 final 30 cycles with predict=true
        resp = self.client.get("/api/v1/fleet/1/replay?predict=true")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsNotNone(data["predicted_rul"])
        # Expected prediction from Notebook 12 test benchmark: 120.9386 cycles
        self.assertAlmostEqual(data["predicted_rul"], 120.93856048583984, places=4)

    def test_insufficient_history_returns_400(self):
        # Unit 1 at cycle 25 has only 25 cycles of history (cycles 1..25), not 30
        resp = self.client.get("/api/v1/fleet/1/replay?end_cycle=25")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Insufficient flight history", resp.json()["detail"])
        self.assertIn("only 25 cycles available", resp.json()["detail"])

    def test_no_ground_truth_rul_leakage(self):
        """
        Guarantees that RUL_FD001.txt is NEVER loaded by FleetService and ground truth RUL
        does not leak through fleet overview, engine summaries, telemetry, or replay.
        """
        # 1. Overview check
        overview_data = self.client.get("/api/v1/fleet").json()
        self.assertNotIn("rul", str(overview_data).lower())
        self.assertNotIn("ground_truth", str(overview_data).lower())

        # 2. Engine summary check
        summary_data = self.client.get("/api/v1/fleet/1").json()
        self.assertNotIn("rul", str(summary_data).lower())
        self.assertNotIn("ground_truth", str(summary_data).lower())

        # 3. Telemetry check
        telemetry_data = self.client.get("/api/v1/fleet/1/telemetry").json()
        for record in telemetry_data["telemetry"]:
            self.assertNotIn("rul", record["sensors"])
            self.assertNotIn("RUL", record["sensors"])

        # 4. Service attributes check: RUL_FD001.txt is not referenced anywhere in FleetService
        fleet_service = app.state.fleet_service
        self.assertFalse(hasattr(fleet_service, "rul_df"))
        self.assertFalse(hasattr(fleet_service, "ground_truth"))

    def test_cors_preflight_options(self):
        """Verifies that CORS preflight OPTIONS requests return appropriate headers for frontend origins."""
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
        resp = self.client.options("/api/v1/predict", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("access-control-allow-origin"), "http://localhost:5173")
        self.assertIn("POST", resp.headers.get("access-control-allow-methods", ""))

if __name__ == "__main__":
    unittest.main()
