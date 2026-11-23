import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class FleetService:
    """
    In-memory fleet management service for NASA C-MAPSS FD001 test fleet.
    Ingests test_FD001.txt once on startup and provides fast, zero-disk lookups
    for fleet overview, individual engine summaries, telemetry history, and 30-cycle replay windows.

    STRICT ISOLATION GUARANTEE:
    Does NOT load, read, or expose RUL_FD001.txt. Ground truth test RUL is never accessed.
    """

    def __init__(self, test_data_path: Path, features_path: Path):
        self.test_data_path = Path(test_data_path)
        self.features_path = Path(features_path)

        self.selected_features: List[str] = []
        # In-memory dictionary: engine_id -> structured engine metadata & telemetry matrix
        self.engines: Dict[int, Dict[str, Any]] = {}
        self.total_records: int = 0
        self.is_loaded: bool = False

    def load_data(self) -> None:
        """
        Loads and indexes the 100 test engines from test_FD001.txt into memory.
        Performs one-time parsing and indexing on startup.
        """
        logger.info("Initializing TURBOGUARD AI Fleet Service...")

        if not self.test_data_path.is_file():
            raise FileNotFoundError(f"Test dataset not found at '{self.test_data_path}'.")
        if not self.features_path.is_file():
            raise FileNotFoundError(f"Feature list not found at '{self.features_path}'.")

        # 1. Load locked 17 feature names
        with open(self.features_path, "r", encoding="utf-8") as f:
            self.selected_features = json.load(f)
        if len(self.selected_features) != 17:
            raise ValueError(f"Expected 17 features, found {len(self.selected_features)}.")

        # 2. Schema for NASA C-MAPSS FD001 telemetry
        columns = (
            ["unit", "cycle"]
            + [f"op_setting_{i}" for i in range(1, 4)]
            + [f"sensor_{i}" for i in range(1, 22)]
        )

        df = pd.read_csv(self.test_data_path, sep=r"\s+", header=None, names=columns)
        self.total_records = len(df)

        self.engines = {}
        for unit_id, group in df.groupby("unit"):
            sorted_group = group.sort_values("cycle").reset_index(drop=True)
            cycles = sorted_group["cycle"].tolist()
            feature_matrix = sorted_group[self.selected_features].values.astype(np.float64)

            # Build record list for telemetry inspection
            records = []
            for idx, cycle_num in enumerate(cycles):
                sensors_dict = {
                    feat: float(feature_matrix[idx, feat_idx])
                    for feat_idx, feat in enumerate(self.selected_features)
                }
                records.append({
                    "cycle": int(cycle_num),
                    "sensors": sensors_dict
                })

            latest_readings = records[-1]["sensors"] if records else {}

            self.engines[int(unit_id)] = {
                "engine_id": int(unit_id),
                "total_cycles": len(cycles),
                "first_cycle": int(cycles[0]),
                "last_cycle": int(cycles[-1]),
                "cycles": cycles,
                "feature_matrix": feature_matrix,
                "records": records,
                "latest_sensor_readings": latest_readings,
                "has_sufficient_history": len(cycles) >= 30,
            }

        self.is_loaded = True
        logger.info(f"FleetService successfully loaded {len(self.engines)} engines ({self.total_records} records).")

    def get_fleet_overview(self) -> Dict[str, Any]:
        """Returns high-level status of the entire 100-engine fleet."""
        if not self.is_loaded:
            raise RuntimeError("FleetService data is not loaded.")

        sorted_ids = sorted(self.engines.keys())
        per_engine_cycles = {eid: self.engines[eid]["total_cycles"] for eid in sorted_ids}
        prediction_ready_count = sum(1 for e in self.engines.values() if e["has_sufficient_history"])

        return {
            "total_engines": len(self.engines),
            "engine_ids": sorted_ids,
            "total_telemetry_records": self.total_records,
            "per_engine_cycles": per_engine_cycles,
            "features": self.selected_features,
            "prediction_ready_count": prediction_ready_count,
        }

    def get_engine_summary(self, engine_id: int) -> Dict[str, Any]:
        """Returns detailed summary for a specific engine."""
        if not self.is_loaded:
            raise RuntimeError("FleetService data is not loaded.")
        if engine_id not in self.engines:
            raise KeyError(f"Engine ID {engine_id} not found in fleet (valid range: 1 to {len(self.engines)}).")

        e = self.engines[engine_id]
        return {
            "engine_id": e["engine_id"],
            "total_cycles": e["total_cycles"],
            "first_cycle": e["first_cycle"],
            "last_cycle": e["last_cycle"],
            "latest_sensor_readings": e["latest_sensor_readings"],
            "has_sufficient_history": e["has_sufficient_history"],
        }

    def get_engine_telemetry(
        self,
        engine_id: int,
        start_cycle: Optional[int] = None,
        end_cycle: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Returns chronological telemetry records with optional cycle range filtering."""
        if not self.is_loaded:
            raise RuntimeError("FleetService data is not loaded.")
        if engine_id not in self.engines:
            raise KeyError(f"Engine ID {engine_id} not found in fleet (valid range: 1 to {len(self.engines)}).")

        e = self.engines[engine_id]
        first_c, last_c = e["first_cycle"], e["last_cycle"]

        start = start_cycle if start_cycle is not None else first_c
        end = end_cycle if end_cycle is not None else last_c

        if start > end:
            raise ValueError(f"start_cycle ({start}) cannot be greater than end_cycle ({end}).")

        filtered_records = [
            r for r in e["records"]
            if start <= r["cycle"] <= end
        ]

        return {
            "engine_id": engine_id,
            "start_cycle": start,
            "end_cycle": end,
            "record_count": len(filtered_records),
            "telemetry": filtered_records,
        }

    def get_engine_replay_window(
        self,
        engine_id: int,
        end_cycle: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Extracts a validated 30-cycle telemetry window ending at `end_cycle`.
        Raises ValueError if fewer than 30 cycles exist prior to `end_cycle`.
        """
        if not self.is_loaded:
            raise RuntimeError("FleetService data is not loaded.")
        if engine_id not in self.engines:
            raise KeyError(f"Engine ID {engine_id} not found in fleet (valid range: 1 to {len(self.engines)}).")

        e = self.engines[engine_id]
        first_c, last_c = e["first_cycle"], e["last_cycle"]

        target_end = end_cycle if end_cycle is not None else last_c

        if target_end < first_c or target_end > last_c:
            raise ValueError(
                f"Requested end_cycle {target_end} is out of bounds for Engine {engine_id} "
                f"(valid range: {first_c} to {last_c})."
            )

        # Cycles in test_FD001 are consecutive starting at 1
        target_start = target_end - 29
        if target_start < first_c:
            available = target_end - first_c + 1
            raise ValueError(
                f"Insufficient flight history for Engine {engine_id} at cycle {target_end}. "
                f"A 30-cycle window requires at least 30 recorded cycles prior to and including cycle {target_end} "
                f"(only {available} cycles available from cycle {first_c} to {target_end})."
            )

        # 1-indexed cycles map to 0-indexed rows (cycle 1 is index 0)
        start_idx = target_start - 1
        end_idx = target_end

        window_matrix = e["feature_matrix"][start_idx:end_idx]
        if window_matrix.shape != (30, 17):
            raise ValueError(f"Extracted window has unexpected shape {window_matrix.shape}, expected (30, 17).")

        return {
            "engine_id": engine_id,
            "start_cycle": target_start,
            "end_cycle": target_end,
            "window_length": 30,
            "feature_names": self.selected_features,
            "sequence": window_matrix.tolist(),
            "disclaimer": "Demonstration/replay telemetry based on NASA C-MAPSS FD001. Not for operational flight dispatch.",
        }
