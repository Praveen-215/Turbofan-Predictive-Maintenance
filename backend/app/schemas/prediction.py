from typing import Any, Dict, List
from pydantic import BaseModel, Field

class PredictionResponse(BaseModel):
    """Output prediction payload for Remaining Useful Life (RUL)."""
    predicted_rul: float = Field(..., description="Estimated Remaining Useful Life in flight cycles.")
    unit: str = Field(default="cycles", description="Operational time-series unit of prediction.")
    model_name: str = Field(default="Stacked LSTM Network", description="Underlying deep learning model architecture.")
    sequence_length: int = Field(default=30, description="Temporal window sequence length in cycles.")
    feature_count: int = Field(default=17, description="Number of sensor/setting features utilized.")
    status: str = Field(default="success", description="Prediction status.")
    disclaimer: str = Field(
        default="Research & demonstration estimate based on NASA C-MAPSS FD001. Not for operational flight dispatch.",
        description="Operational context and safety disclaimer."
    )

class HealthResponse(BaseModel):
    """Application health and ML model readiness payload."""
    status: str
    model_loaded: bool
    scaler_loaded: bool
    features_loaded: bool
    model_name: str
    input_shape: List[int]
    features_count: int
    features_list: List[str]
    metadata: Dict[str, Any]
