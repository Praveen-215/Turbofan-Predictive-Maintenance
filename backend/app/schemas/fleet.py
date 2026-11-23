from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class FleetOverviewResponse(BaseModel):
    total_engines: int = Field(..., description="Total aircraft engines in the fleet.")
    engine_ids: List[int] = Field(..., description="List of all engine IDs (1 to 100).")
    total_telemetry_records: int = Field(..., description="Total multi-sensor observations recorded.")
    per_engine_cycles: Dict[int, int] = Field(..., description="Mapping of engine ID to its total recorded cycles.")
    features: List[str] = Field(..., description="List of 17 monitored telemetry sensor/setting features.")
    prediction_ready_count: int = Field(..., description="Count of engines with at least 30 recorded cycles.")

class EngineSummaryResponse(BaseModel):
    engine_id: int = Field(..., description="Engine unique identifier.")
    total_cycles: int = Field(..., description="Total recorded operational flight cycles.")
    first_cycle: int = Field(..., description="First recorded cycle number.")
    last_cycle: int = Field(..., description="Latest/last recorded cycle number.")
    latest_sensor_readings: Dict[str, float] = Field(..., description="Most recent sensor readings (17 features).")
    has_sufficient_history: bool = Field(..., description="Whether engine has at least 30 recorded cycles.")

class TelemetryRecord(BaseModel):
    cycle: int = Field(..., description="Flight cycle number.")
    sensors: Dict[str, float] = Field(..., description="17 sensor and operational setting values.")

class EngineTelemetryResponse(BaseModel):
    engine_id: int
    start_cycle: int
    end_cycle: int
    record_count: int
    telemetry: List[TelemetryRecord]

class EngineReplayResponse(BaseModel):
    engine_id: int
    start_cycle: int
    end_cycle: int
    window_length: int = Field(default=30)
    feature_names: List[str]
    sequence: List[List[float]]
    predicted_rul: Optional[float] = Field(default=None, description="Optional predicted RUL in cycles if predict=True.")
    disclaimer: str = Field(
        default="Demonstration/replay telemetry based on NASA C-MAPSS FD001. Not for operational flight dispatch.",
        description="Safety and context disclaimer."
    )
