import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np

from backend.app.core.config import settings
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    ArchitectureDetails,
    ArtifactItem,
    ArtifactProvenance,
    BenchmarkModelEntry,
    DatasetProtocolInfo,
    EpochRecord,
    EvaluationSummary,
    LayerSpec,
    ModelComparisonSection,
    NasaScoringInfo,
    PartitionMetrics,
    PreprocessingConfig,
    RandomForestHyperparameters,
    TestParityRecord,
    TestParityResponse,
    TestParitySummary,
    TrainingHistory,
)
from backend.app.services.fleet_service import FleetService
from backend.app.services.inference_service import InferenceService

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Dedicated analytics service for TURBOGUARD AI.
    Compiles verified empirical benchmark data, model architectures, training histories,
    and manages safe, cached computation of the 100-engine held-out test parity dataset.

    STRICT ISOLATION GUARANTEES:
      1. RUL_FD001.txt is ingested and processed ONLY inside this analytics service.
      2. Ground truth is NEVER exposed to or mixed with fleet management, telemetry replay,
         or general inference services.
      3. The 100 test predictions are computed once via the existing InferenceService and
         cached behind an asynchronous lock for concurrency safety.
    """

    def __init__(self, rul_data_path: Optional[Path] = None):
        self.rul_data_path = Path(rul_data_path) if rul_data_path else (settings.DATA_DIR / "RUL_FD001.txt")
        self._test_parity_cache: Optional[TestParityResponse] = None
        self._cache_lock = asyncio.Lock()

    def clear_cache(self) -> None:
        """Clears the cached test parity response (used primarily in automated testing)."""
        self._test_parity_cache = None

    def get_overview(self, inference_service: Optional[InferenceService] = None) -> AnalyticsOverviewResponse:
        """
        Compiles the comprehensive, structured overview of dataset provenance, preprocessing,
        5-model benchmark matrix, exact neural architectures, 12-epoch training log,
        and verified filesystem artifact sizes.
        """
        # 1. Dataset & Preprocessing Configuration
        dataset_protocol = DatasetProtocolInfo()

        feature_names = (
            inference_service.selected_features
            if inference_service and inference_service.is_loaded
            else [
                "op_setting_1", "op_setting_2", "sensor_2", "sensor_3", "sensor_4",
                "sensor_6", "sensor_7", "sensor_8", "sensor_9", "sensor_11",
                "sensor_12", "sensor_13", "sensor_14", "sensor_15", "sensor_17",
                "sensor_20", "sensor_21"
            ]
        )
        preprocessing = PreprocessingConfig(feature_names=feature_names)

        # 2. Benchmark Model Comparison Matrix (Validation Partition, N = 3,490)
        benchmark_models = [
            BenchmarkModelEntry(
                model_name="Linear Regression",
                architecture_type="Ordinary Least Squares",
                input_representation="2D Flattened (510 features)",
                parameter_count=511,
                train_rmse=16.8713,
                val_rmse=15.7605,
                train_nasa=62440.46,
                val_nasa=12653.03,
                val_nasa_per_sample=3.6255,
                is_selected=False,
                selection_notes="Classical linear baseline; unable to capture non-linear degradation dynamics."
            ),
            BenchmarkModelEntry(
                model_name="Random Forest",
                architecture_type="Ensemble Decision Trees (Bagging)",
                input_representation="2D Flattened (510 features)",
                parameter_count=None,
                train_rmse=7.5190,
                val_rmse=16.0702,
                train_nasa=12900.71,
                val_nasa=17469.11,
                val_nasa_per_sample=5.0055,
                is_selected=False,
                selection_notes="Severe overfitting to training partition (train RMSE 7.52 vs val RMSE 16.07)."
            ),
            BenchmarkModelEntry(
                model_name="Stacked LSTM",
                architecture_type="2-Layer Recurrent Neural Network (LSTM)",
                input_representation="3D Temporal Sequence (30 x 17 features)",
                parameter_count=33953,
                train_rmse=11.1830,
                val_rmse=13.4770,
                train_nasa=27439.63,
                val_nasa=11396.72,
                val_nasa_per_sample=3.2655,
                is_selected=True,
                selection_notes="Lowest validation NASA asymmetric penalty score (11,396.72 / 3.2655 per sample)."
            ),
            BenchmarkModelEntry(
                model_name="Stacked GRU",
                architecture_type="2-Layer Recurrent Neural Network (GRU)",
                input_representation="3D Temporal Sequence (30 x 17 features)",
                parameter_count=25889,
                train_rmse=13.2109,
                val_rmse=12.8966,
                train_nasa=51931.39,
                val_nasa=12457.54,
                val_nasa_per_sample=3.5695,
                is_selected=False,
                selection_notes="Lowest validation RMSE (12.8966 cycles), but higher NASA asymmetric score than LSTM."
            ),
            BenchmarkModelEntry(
                model_name="1D-CNN",
                architecture_type="Temporal Convolutional Network (Conv1D + GAP)",
                input_representation="3D Temporal Sequence (30 x 17 features)",
                parameter_count=32193,
                train_rmse=16.2027,
                val_rmse=18.9131,
                train_nasa=76352.40,
                val_nasa=33322.05,
                val_nasa_per_sample=9.5479,
                is_selected=False,
                selection_notes="Highest validation error and largest NASA asymmetric penalty among sequential models."
            ),
        ]
        model_comparison = ModelComparisonSection(benchmark_models=benchmark_models)

        # 3. Stacked LSTM Architecture (Production Model, 33,953 params)
        lstm_layers = [
            LayerSpec(
                layer_index=0,
                layer_name="input_layer",
                layer_type="InputLayer",
                output_shape="(None, 30, 17)",
                param_count=0,
                details="Input sequence: 30 operational cycles x 17 normalized sensor channels."
            ),
            LayerSpec(
                layer_index=1,
                layer_name="lstm",
                layer_type="LSTM",
                output_shape="(None, 30, 64)",
                param_count=20992,
                details="64 hidden units, return_sequences=True, activation='tanh', recurrent_activation='sigmoid'."
            ),
            LayerSpec(
                layer_index=2,
                layer_name="dropout",
                layer_type="Dropout",
                output_shape="(None, 30, 64)",
                param_count=0,
                details="Dropout rate = 0.20 for recurrent sequence regularization."
            ),
            LayerSpec(
                layer_index=3,
                layer_name="lstm_1",
                layer_type="LSTM",
                output_shape="(None, 32)",
                param_count=12416,
                details="32 hidden units, return_sequences=False, activation='tanh', recurrent_activation='sigmoid'."
            ),
            LayerSpec(
                layer_index=4,
                layer_name="dropout_1",
                layer_type="Dropout",
                output_shape="(None, 32)",
                param_count=0,
                details="Dropout rate = 0.20 for bottleneck representation regularization."
            ),
            LayerSpec(
                layer_index=5,
                layer_name="dense",
                layer_type="Dense",
                output_shape="(None, 16)",
                param_count=528,
                details="16 hidden units, activation='relu'."
            ),
            LayerSpec(
                layer_index=6,
                layer_name="dense_1",
                layer_type="Dense",
                output_shape="(None, 1)",
                param_count=17,
                details="1 output unit, activation='linear' (Remaining Useful Life in cycles)."
            ),
        ]
        lstm_architecture = ArchitectureDetails(
            model_name="Stacked LSTM Network",
            total_parameters=33953,
            trainable_parameters=33953,
            non_trainable_parameters=0,
            input_shape="(None, 30, 17)",
            layers=lstm_layers,
            summary_notes="Sequential two-stage recurrent LSTM with intermediate dropout and dense projection."
        )

        # 4. 1D-CNN Architecture (Benchmark Model, 32,193 params)
        cnn_layers = [
            LayerSpec(
                layer_index=0,
                layer_name="input_layer",
                layer_type="InputLayer",
                output_shape="(None, 30, 17)",
                param_count=0,
                details="Input sequence: 30 cycles x 17 normalized sensor channels."
            ),
            LayerSpec(
                layer_index=1,
                layer_name="conv1d_1",
                layer_type="Conv1D",
                output_shape="(None, 30, 64)",
                param_count=3328,
                details="64 filters, kernel_size=3, padding='same', activation='relu'."
            ),
            LayerSpec(
                layer_index=2,
                layer_name="max_pooling1d",
                layer_type="MaxPooling1D",
                output_shape="(None, 15, 64)",
                param_count=0,
                details="pool_size=2 for temporal downsampling."
            ),
            LayerSpec(
                layer_index=3,
                layer_name="conv1d_2",
                layer_type="Conv1D",
                output_shape="(None, 15, 128)",
                param_count=24704,
                details="128 filters, kernel_size=3, padding='same', activation='relu'."
            ),
            LayerSpec(
                layer_index=4,
                layer_name="global_average_pooling1d",
                layer_type="GlobalAveragePooling1D",
                output_shape="(None, 128)",
                param_count=0,
                details="Global Average Pooling across remaining 15 temporal steps (NOT MaxPooling)."
            ),
            LayerSpec(
                layer_index=5,
                layer_name="dense_1",
                layer_type="Dense",
                output_shape="(None, 32)",
                param_count=4128,
                details="32 hidden units, activation='relu'."
            ),
            LayerSpec(
                layer_index=6,
                layer_name="dropout",
                layer_type="Dropout",
                output_shape="(None, 32)",
                param_count=0,
                details="Dropout rate = 0.20."
            ),
            LayerSpec(
                layer_index=7,
                layer_name="dense_output",
                layer_type="Dense",
                output_shape="(None, 1)",
                param_count=33,
                details="1 unit, activation='linear'."
            ),
        ]
        cnn_architecture = ArchitectureDetails(
            model_name="1D Convolutional Neural Network",
            total_parameters=32193,
            trainable_parameters=32193,
            non_trainable_parameters=0,
            input_shape="(None, 30, 17)",
            layers=cnn_layers,
            summary_notes="Temporal Conv1D with intermediate MaxPooling1D and terminal GlobalAveragePooling1D."
        )

        # 5. Random Forest Hyperparameters
        random_forest_hyperparameters = RandomForestHyperparameters()

        # 6. Stacked LSTM Training History across 12 Epochs
        epochs = [
            EpochRecord(epoch=1, train_loss=6221.6006, train_rmse=78.8771, val_loss=3780.1099, val_rmse=61.4826),
            EpochRecord(epoch=2, train_loss=1956.4791, train_rmse=44.2321, val_loss=556.0778, val_rmse=23.5813),
            EpochRecord(epoch=3, train_loss=384.4953, train_rmse=19.6086, val_loss=184.5351, val_rmse=13.5844),
            EpochRecord(epoch=4, train_loss=245.6007, train_rmse=15.6717, val_loss=182.3366, val_rmse=13.5032),
            EpochRecord(epoch=5, train_loss=208.5025, train_rmse=14.4396, val_loss=181.6308, val_rmse=13.4770),
            EpochRecord(epoch=6, train_loss=187.9921, train_rmse=13.7110, val_loss=198.2133, val_rmse=14.0788),
            EpochRecord(epoch=7, train_loss=162.5221, train_rmse=12.7484, val_loss=216.1839, val_rmse=14.7032),
            EpochRecord(epoch=8, train_loss=149.4285, train_rmse=12.2241, val_loss=195.9491, val_rmse=13.9982),
            EpochRecord(epoch=9, train_loss=134.1466, train_rmse=11.5822, val_loss=198.3122, val_rmse=14.0823),
            EpochRecord(epoch=10, train_loss=128.6773, train_rmse=11.3436, val_loss=210.6768, val_rmse=14.5147),
            EpochRecord(epoch=11, train_loss=119.6514, train_rmse=10.9385, val_loss=197.3607, val_rmse=14.0485),
            EpochRecord(epoch=12, train_loss=110.0296, train_rmse=10.4895, val_loss=213.5625, val_rmse=14.6138),
        ]
        training_history = TrainingHistory(epochs=epochs)

        # 7. Dynamic Artifact Verification on Filesystem
        artifact_specs = [
            ("Model weights (.keras)", settings.MODEL_PATH, 449605, "Trained Keras 3 Stacked LSTM network weights and architecture."),
            ("StandardScaler (.pkl)", settings.SCALER_PATH, 1423, "Fitted scikit-learn StandardScaler (17 feature channels)."),
            ("Selected features (.json)", settings.FEATURES_PATH, 256, "Locked canonical JSON list of 17 active sensor/setting names."),
            ("Model metadata (.json)", settings.METADATA_PATH, 1734, "Operational hyperparameters, training split metadata, and validation metrics."),
        ]

        artifact_items = []
        all_verified = True
        for name, path, expected_bytes, desc in artifact_specs:
            p = Path(path)
            exists = p.is_file()
            actual_bytes = p.stat().st_size if exists else 0
            if not exists or actual_bytes != expected_bytes:
                all_verified = False
            artifact_items.append(
                ArtifactItem(
                    name=name,
                    filename=p.name,
                    file_path=str(p),
                    exists_on_disk=exists,
                    size_bytes=actual_bytes,
                    expected_size_bytes=expected_bytes,
                    description=desc,
                )
            )

        artifact_provenance = ArtifactProvenance(
            artifacts=artifact_items,
            verification_status="VERIFIED_EXACT" if all_verified else "MISMATCH_OR_MISSING"
        )

        # 8. NASA Scoring Information
        nasa_scoring = NasaScoringInfo()

        # 9. Strictly Separated Evaluation Summary
        val_metrics = PartitionMetrics(
            partition_name="Validation Set",
            sample_count=3490,
            sample_unit="30-cycle sliding sequences",
            rmse=13.4770,
            nasa_total_score=11396.72,
            nasa_score_per_sample=3.2655,
            protocol_description="Evaluated on 3,490 sliding windows across arbitrary wear phases of 20 hold-out training engines."
        )
        test_metrics = PartitionMetrics(
            partition_name="Held-Out Test Set",
            sample_count=100,
            sample_unit="blind test engines (terminal 30-cycle windows)",
            rmse=15.1041,
            nasa_total_score=304.49,
            nasa_score_per_sample=3.0449,
            protocol_description="Evaluated on exactly one terminal 30-cycle sequence per engine across 100 blind test engines against withheld RUL."
        )
        evaluation_summary = EvaluationSummary(
            validation_metrics=val_metrics,
            blind_test_metrics=test_metrics
        )

        return AnalyticsOverviewResponse(
            dataset_protocol=dataset_protocol,
            preprocessing=preprocessing,
            model_comparison=model_comparison,
            lstm_architecture=lstm_architecture,
            cnn_architecture=cnn_architecture,
            random_forest_hyperparameters=random_forest_hyperparameters,
            training_history=training_history,
            artifact_provenance=artifact_provenance,
            nasa_scoring=nasa_scoring,
            evaluation_summary=evaluation_summary,
        )

    async def get_test_parity(
        self,
        inference_service: InferenceService,
        fleet_service: FleetService
    ) -> TestParityResponse:
        """
        Computes and caches the point-level parity records across all 100 held-out test engines.

        Deterministic Execution Pipeline:
          1. Safe cache check: returns cached response immediately if already computed.
          2. Acquisition of asyncio.Lock to prevent concurrent duplicate inference runs.
          3. Re-checks cache under lock.
          4. Ingests RUL_FD001.txt and verifies exactly 100 ground-truth values.
          5. Extracts the terminal 30-cycle window for each test engine from FleetService.
          6. Executes forward pass via loaded InferenceService.
          7. Validates exactly 100 finite records, correct residual calculation, and aggregate metrics.
          8. Caches the verified response payload.
        """
        # Fast path without lock
        if self._test_parity_cache is not None:
            return self._test_parity_cache

        async with self._cache_lock:
            # Re-check under lock
            if self._test_parity_cache is not None:
                return self._test_parity_cache

            logger.info("Computing 100-engine held-out test parity dataset via InferenceService...")

            # Validate services readiness
            if not inference_service or not inference_service.is_loaded:
                raise RuntimeError("InferenceService is unavailable or model artifacts are not loaded.")
            if not fleet_service or not fleet_service.is_loaded:
                raise RuntimeError("FleetService is unavailable or test data is not loaded.")

            # Validate and read ground-truth test labels
            if not self.rul_data_path.is_file():
                error_msg = f"Held-out test labels file not found at '{self.rul_data_path}'."
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)

            raw_rul_lines = self.rul_data_path.read_text(encoding="utf-8").splitlines()
            rul_values = [float(line.strip()) for line in raw_rul_lines if line.strip()]

            if len(rul_values) != 100:
                raise ValueError(f"Expected exactly 100 ground-truth RUL values, found {len(rul_values)}.")

            records: List[TestParityRecord] = []
            residuals_list: List[float] = []

            for engine_id in range(1, 101):
                if engine_id not in fleet_service.engines:
                    raise KeyError(f"Engine ID {engine_id} missing from loaded fleet dataset.")

                engine_meta = fleet_service.engines[engine_id]
                feature_matrix = engine_meta.get("feature_matrix")

                if feature_matrix is None or len(feature_matrix) < 30:
                    raise ValueError(f"Engine {engine_id} has insufficient history for 30-cycle inference.")

                # Slices terminal 30 chronological telemetry cycles
                terminal_window = feature_matrix[-30:].tolist()

                # Execute forward pass using established production pipeline
                predicted_rul = float(
                    inference_service.predict_rul(
                        terminal_window,
                        feature_names=inference_service.selected_features
                    )
                )

                if not np.isfinite(predicted_rul):
                    raise ValueError(f"Non-finite prediction produced for Engine {engine_id}: {predicted_rul}")

                actual_rul = float(rul_values[engine_id - 1])
                if not np.isfinite(actual_rul):
                    raise ValueError(f"Non-finite ground-truth RUL for Engine {engine_id}: {actual_rul}")

                residual = predicted_rul - actual_rul
                if not np.isfinite(residual):
                    raise ValueError(f"Non-finite residual calculated for Engine {engine_id}: {residual}")

                records.append(
                    TestParityRecord(
                        engine_id=engine_id,
                        actual_rul=actual_rul,
                        predicted_rul=predicted_rul,
                        residual=residual,
                    )
                )
                residuals_list.append(residual)

            # Assert complete 100-engine dataset integrity
            if len(records) != 100:
                raise ValueError(f"Expected 100 test parity records, generated {len(records)}.")

            unique_engine_ids = {r.engine_id for r in records}
            if len(unique_engine_ids) != 100 or unique_engine_ids != set(range(1, 101)):
                raise ValueError("Engine ID mismatch in generated test parity records.")

            residuals_arr = np.array(residuals_list, dtype=np.float64)
            test_rmse = float(np.sqrt(np.mean(residuals_arr ** 2)))

            d = residuals_arr
            nasa_scores = np.where(d < 0, np.expm1(-d / 13.0), np.expm1(d / 10.0))
            test_nasa_total = float(np.sum(nasa_scores))
            test_nasa_per_engine = test_nasa_total / 100.0

            # Guardrail assertion against mathematical deviation from verified benchmark
            if abs(test_rmse - 15.1041) > 0.05:
                logger.warning(f"Calculated test RMSE ({test_rmse:.4f}) deviates slightly from verified reference (15.1041).")
            if abs(test_nasa_total - 304.49) > 1.0:
                logger.warning(f"Calculated test NASA ({test_nasa_total:.2f}) deviates slightly from verified reference (304.49).")

            summary = TestParitySummary(
                engine_count=100,
                test_rmse=test_rmse,
                test_nasa_total=test_nasa_total,
                test_nasa_per_engine=test_nasa_per_engine,
            )

            response = TestParityResponse(
                evaluation_partition="test",
                dataset="NASA C-MAPSS FD001",
                engine_count=100,
                window_size=30,
                feature_count=17,
                model_name=inference_service.metadata.get("model_name", "Stacked LSTM Network"),
                summary=summary,
                records=records,
            )

            self._test_parity_cache = response
            logger.info("Test parity dataset computed and cached successfully (100 records).")
            return response
