from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 1. Dataset & Preprocessing Configuration
# ---------------------------------------------------------------------------

class DatasetProtocolInfo(BaseModel):
    """Dataset provenance and train/validation/test evaluation protocol specifications."""
    dataset_name: str = Field(default="NASA C-MAPSS FD001")
    training_engines: int = Field(default=80, description="Count of run-to-failure engines in training partition.")
    validation_engines: int = Field(default=20, description="Count of held-out training engines in validation partition.")
    validation_sequences: int = Field(default=3490, description="Count of 30-cycle sliding windows in validation partition.")
    blind_test_engines: int = Field(default=100, description="Count of distinct aircraft engines in held-out test fleet.")
    blind_test_sequences: int = Field(default=100, description="One single terminal 30-cycle window per test engine.")
    window_size: int = Field(default=30, description="Sequence window length in operational cycles.")
    feature_count: int = Field(default=17, description="Number of active sensor and operational setting channels.")
    max_rul_cap: int = Field(default=125, description="Piecewise linear upper saturation threshold for RUL in cycles.")
    evaluation_protocol: str = Field(
        default=(
            "Engine-wise 80/20 train/validation split on train_FD001.txt (random_state=42). "
            "Validation evaluated across 3,490 sliding windows across arbitrary degradation phases. "
            "Held-out test evaluated strictly on 100 terminal 30-cycle windows from test_FD001.txt against withheld RUL_FD001.txt."
        ),
        description="Formal evaluation partitioning description."
    )
    disclaimer: str = Field(
        default=(
            "Benchmark predictions and metrics on simulated NASA C-MAPSS FD001 turbofan data. "
            "Not certified for operational flight dispatch, airworthiness certification, or safety-critical maintenance."
        ),
        description="Safety and scope boundaries disclaimer."
    )


class PreprocessingConfig(BaseModel):
    """Deterministic feature preprocessing and normalization specifications."""
    window_size: int = Field(default=30)
    stride: int = Field(default=1)
    feature_names: List[str] = Field(..., description="Ordered canonical list of 17 active features.")
    scaler_type: str = Field(default="StandardScaler")
    scaler_fit_partition: str = Field(
        default="Fitted strictly on 80 training engines (zero data leakage to validation or test partitions)."
    )
    dropped_zero_variance_features: List[str] = Field(
        default=["op_setting_3", "sensor_1", "sensor_5", "sensor_10", "sensor_16", "sensor_18", "sensor_19"],
        description="7 features identified as constant or zero-variance on the training partition."
    )
    retained_near_constant_features: List[str] = Field(
        default=["sensor_6"],
        description="1 sensor (HPC outlet pressure) with 98.1% constant values retained after sensitivity analysis."
    )


# ---------------------------------------------------------------------------
# 2. Benchmark Model Comparison
# ---------------------------------------------------------------------------

class BenchmarkModelEntry(BaseModel):
    """Performance metrics for an evaluated candidate architecture on the validation partition."""
    model_name: str
    architecture_type: str
    input_representation: str
    parameter_count: Optional[int] = None
    train_rmse: float
    val_rmse: float
    train_nasa: float
    val_nasa: float
    val_nasa_per_sample: float
    is_selected: bool = False
    selection_notes: Optional[str] = None


class ModelComparisonSection(BaseModel):
    """Consolidated 5-model benchmark matrix and selection rationale."""
    benchmark_models: List[BenchmarkModelEntry]
    selected_model_name: str = Field(default="Stacked LSTM")
    primary_selection_criterion: str = Field(
        default="Lowest Validation NASA Asymmetric Score (11,396.72 total / 3.2655 per sample)."
    )
    secondary_selection_criterion: str = Field(
        default="Validation RMSE (13.4770 cycles)."
    )
    selection_rationale: str = Field(
        default=(
            "Stacked GRU achieved the lowest validation RMSE (12.8966 cycles vs. 13.4770 for LSTM), "
            "but Stacked LSTM achieved the lowest validation NASA asymmetric penalty score (11,396.72 vs. 12,457.54 for GRU), "
            "demonstrating superior resistance to steep exponential over-prediction penalties under the benchmark asymmetric cost formulation."
        )
    )


# ---------------------------------------------------------------------------
# 3. Model Architectures & Hyperparameters
# ---------------------------------------------------------------------------

class LayerSpec(BaseModel):
    """Specification of an individual neural network layer."""
    layer_index: int
    layer_name: str
    layer_type: str
    output_shape: str
    param_count: int
    details: str


class ArchitectureDetails(BaseModel):
    """Detailed layer-by-layer architectural breakdown of a deep neural network."""
    model_name: str
    total_parameters: int
    trainable_parameters: int
    non_trainable_parameters: int
    input_shape: str
    layers: List[LayerSpec]
    summary_notes: Optional[str] = None


class RandomForestHyperparameters(BaseModel):
    """Hyperparameters of the benchmark Random Forest Regressor."""
    n_estimators: int = Field(default=200, description="Number of trees in ensemble.")
    max_features: str = Field(default="sqrt", description="Features per split (sqrt(510) ~ 22).")
    min_samples_leaf: int = Field(default=2, description="Minimum samples per terminal leaf.")
    random_state: int = Field(default=42, description="RNG seed for reproducibility.")
    n_jobs: int = Field(default=-1, description="CPU parallelism setting.")
    max_depth: Optional[int] = Field(
        default=None,
        description="Unspecified in research code — evaluated at Scikit-learn library default (None: unbounded tree depth)."
    )
    parameter_specification_notes: str = Field(
        default=(
            "n_estimators=200, max_features='sqrt', min_samples_leaf=2, random_state=42, and n_jobs=-1 "
            "were explicitly specified in the research code; max_depth was not specified and evaluated at the scikit-learn library default of None."
        )
    )


# ---------------------------------------------------------------------------
# 4. Training History & Checkpointing
# ---------------------------------------------------------------------------

class EpochRecord(BaseModel):
    """Training and validation metrics for an individual training epoch."""
    epoch: int
    train_loss: float
    train_rmse: float
    val_loss: float
    val_rmse: float


class TrainingHistory(BaseModel):
    """Complete 12-epoch training log and early stopping provenance for the production Stacked LSTM."""
    total_epochs: int = Field(default=12)
    best_epoch: int = Field(default=5)
    best_val_loss: float = Field(default=181.6308)
    best_val_rmse: float = Field(default=13.4770)
    early_stopping_triggered: bool = Field(default=True)
    early_stopping_epoch: int = Field(default=12)
    early_stopping_patience: int = Field(default=7)
    monitor_metric: str = Field(default="val_loss")
    weights_restored_from_epoch: int = Field(default=5)
    epochs: List[EpochRecord]


# ---------------------------------------------------------------------------
# 5. Artifact Provenance
# ---------------------------------------------------------------------------

class ArtifactItem(BaseModel):
    """Metadata and filesystem verification status for a serialized production artifact."""
    name: str
    filename: str
    file_path: str
    exists_on_disk: bool
    size_bytes: int
    expected_size_bytes: int
    description: str


class ArtifactProvenance(BaseModel):
    """Provenance audit for all four production ML artifacts."""
    artifacts: List[ArtifactItem]
    verification_status: str


# ---------------------------------------------------------------------------
# 6. NASA Scoring Definition
# ---------------------------------------------------------------------------

class NasaScoringInfo(BaseModel):
    """Formal definition and asymmetric penalty dynamics of the NASA scoring function."""
    formula: str = Field(
        default="d = predicted_RUL - actual_RUL; s = exp(-d/13) - 1 for d < 0; s = exp(d/10) - 1 for d >= 0; Total = sum(s)"
    )
    under_prediction_penalty: str = Field(
        default="exp(-d / 13) - 1 for d < 0 (early prediction / underestimation, scaled by denominator 13)"
    )
    over_prediction_penalty: str = Field(
        default="exp(d / 10) - 1 for d >= 0 (late prediction / overestimation, scaled by denominator 10)"
    )
    asymmetry_interpretation: str = Field(
        default=(
            "Over-prediction is penalized more steeply than under-prediction for equal absolute error magnitudes: "
            "because 10 < 13, exp(|d|/10) grows faster than exp(|d|/13). Late RUL estimates carry higher penalty weighting."
        )
    )


# ---------------------------------------------------------------------------
# 7. Separated Evaluation Metrics
# ---------------------------------------------------------------------------

class PartitionMetrics(BaseModel):
    """Aggregate performance metrics for a specific evaluation partition."""
    partition_name: str
    sample_count: int
    sample_unit: str
    rmse: float
    nasa_total_score: float
    nasa_score_per_sample: float
    protocol_description: str


class EvaluationSummary(BaseModel):
    """Clear separation between validation and held-out test evaluation results."""
    validation_metrics: PartitionMetrics
    blind_test_metrics: PartitionMetrics
    generalization_notes: str = Field(
        default=(
            "Validation and held-out test evaluations use fundamentally distinct protocols: "
            "validation evaluates 3,490 overlapping sliding windows across arbitrary operational stages of 20 engines, "
            "while test evaluates exactly 100 single terminal windows (one per engine). "
            "A lower sample-normalized test score does not prove superior generalization across the domain."
        )
    )


# ---------------------------------------------------------------------------
# 8. Consolidated API Responses
# ---------------------------------------------------------------------------

class AnalyticsOverviewResponse(BaseModel):
    """Consolidated response payload for GET /api/v1/analytics/overview."""
    dataset_protocol: DatasetProtocolInfo
    preprocessing: PreprocessingConfig
    model_comparison: ModelComparisonSection
    lstm_architecture: ArchitectureDetails
    cnn_architecture: ArchitectureDetails
    random_forest_hyperparameters: RandomForestHyperparameters
    training_history: TrainingHistory
    artifact_provenance: ArtifactProvenance
    nasa_scoring: NasaScoringInfo
    evaluation_summary: EvaluationSummary


class TestParityRecord(BaseModel):
    """Point-level parity record for a single held-out test engine."""
    engine_id: int = Field(..., ge=1, le=100, description="Engine unique identifier (1 to 100).")
    actual_rul: float = Field(..., description="Ground-truth RUL in cycles from RUL_FD001.txt.")
    predicted_rul: float = Field(..., description="Inferred RUL in cycles from Stacked LSTM on terminal 30-cycle window.")
    residual: float = Field(..., description="predicted_rul - actual_rul in cycles.")


class TestParitySummary(BaseModel):
    """Aggregate metrics across all 100 held-out test engines."""
    engine_count: int = Field(default=100)
    test_rmse: float = Field(default=15.1041, description="Root Mean Squared Error across 100 test engines in cycles.")
    test_nasa_total: float = Field(default=304.49, description="Total NASA asymmetric penalty score across 100 test engines.")
    test_nasa_per_engine: float = Field(default=3.0449, description="NASA asymmetric penalty score normalized per engine.")


class TestParityResponse(BaseModel):
    """Consolidated response payload for GET /api/v1/analytics/test-parity."""
    evaluation_partition: str = Field(default="test")
    dataset: str = Field(default="NASA C-MAPSS FD001")
    engine_count: int = Field(default=100)
    window_size: int = Field(default=30)
    feature_count: int = Field(default=17)
    model_name: str = Field(default="Stacked LSTM Network")
    evaluation_protocol: str = Field(
        default="Evaluation of terminal 30-cycle sequences from 100 blind test engines against official ground truth RUL."
    )
    disclaimer: str = Field(
        default="Benchmark predictions on simulated NASA C-MAPSS FD001 turbofan data. Not for operational flight dispatch or certified maintenance."
    )
    summary: TestParitySummary
    records: List[TestParityRecord]
