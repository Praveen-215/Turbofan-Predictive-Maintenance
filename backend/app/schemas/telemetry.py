import math
from typing import List
from pydantic import BaseModel, Field, field_validator

class TelemetrySequenceRequest(BaseModel):
    """
    Validates a 30-cycle temporal window of telemetry observations.
    Requires:
      1. feature_names: Ordered list of the 17 selected feature names.
      2. sequence: A 30x17 matrix containing 30 chronological cycles of 17 finite float values.
    """
    feature_names: List[str] = Field(
        ...,
        description="Explicit ordered list of the 17 selected feature names matching selected_features.json."
    )
    sequence: List[List[float]] = Field(
        ...,
        description="A 30-cycle sequence with 17 sensor/setting values per cycle in order."
    )

    @field_validator("feature_names")
    def validate_feature_names_count(cls, v):
        if len(v) != 17:
            raise ValueError(f"feature_names must contain exactly 17 feature names, received {len(v)}.")
        return v

    @field_validator("sequence")
    def validate_sequence_shape_and_finite(cls, v):
        if len(v) != 30:
            raise ValueError(f"Sequence length must be exactly 30 cycles, received {len(v)} cycles.")
        for cycle_idx, cycle_values in enumerate(v):
            if len(cycle_values) != 17:
                raise ValueError(
                    f"Cycle {cycle_idx + 1} must contain exactly 17 feature values, received {len(cycle_values)}."
                )
            for feat_idx, val in enumerate(cycle_values):
                if val is None or not isinstance(val, (int, float)) or not math.isfinite(val):
                    raise ValueError(
                        f"Non-finite or invalid numeric value at cycle {cycle_idx + 1}, feature index {feat_idx}: {val}"
                    )
        return v
