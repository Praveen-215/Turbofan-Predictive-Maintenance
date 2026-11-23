import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf

logger = logging.getLogger(__name__)

class InferenceService:
    """
    Singleton-style inference service for TURBOGUARD AI.
    Loads and caches the Stacked LSTM model, fitted StandardScaler, feature definitions,
    and metadata once at application startup.
    """

    def __init__(
        self,
        model_path: Path,
        scaler_path: Path,
        features_path: Path,
        metadata_path: Path,
    ):
        self.model_path = Path(model_path)
        self.scaler_path = Path(scaler_path)
        self.features_path = Path(features_path)
        self.metadata_path = Path(metadata_path)

        self.model: Optional[tf.keras.Model] = None
        self.scaler: Any = None
        self.selected_features: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.is_loaded: bool = False

    def load_artifacts(self) -> None:
        """
        Loads all required ML production artifacts from disk and verifies integrity.
        Raises descriptive FileNotFoundError or ValueError if validation fails.
        """
        logger.info("Initializing TURBOGUARD AI Inference Service...")

        # Verify all four artifact files exist
        for path, name in [
            (self.model_path, "Model weights (.keras)"),
            (self.scaler_path, "StandardScaler (.pkl)"),
            (self.features_path, "Feature list (.json)"),
            (self.metadata_path, "Model metadata (.json)"),
        ]:
            if not path.is_file():
                error_msg = f"Required ML artifact missing: {name} at '{path}'"
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)

        # 1. Load 17 Selected Features
        with open(self.features_path, "r", encoding="utf-8") as f:
            self.selected_features = json.load(f)
        if len(self.selected_features) != 17:
            raise ValueError(
                f"Feature list count mismatch. Expected exactly 17 features, found {len(self.selected_features)}."
            )
        logger.info(f"Loaded {len(self.selected_features)} selected feature names.")

        # 2. Load Model Provenance Metadata
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        logger.info(f"Loaded metadata for model: {self.metadata.get('model_name', 'Unknown')}")

        # 3. Load Fitted StandardScaler
        self.scaler = joblib.load(self.scaler_path)
        if getattr(self.scaler, "n_features_in_", None) != len(self.selected_features):
            raise ValueError(
                f"Scaler feature count mismatch: scaler expects {self.scaler.n_features_in_}, "
                f"but feature list contains {len(self.selected_features)} features."
            )
        logger.info("Fitted StandardScaler successfully loaded.")

        # 4. Load Keras Deep Learning Model
        self.model = tf.keras.models.load_model(self.model_path)
        expected_shape = (None, 30, len(self.selected_features))
        if self.model.input_shape != expected_shape:
            raise ValueError(
                f"Model input shape mismatch. Expected {expected_shape}, found {self.model.input_shape}."
            )
        logger.info(f"Stacked LSTM model loaded successfully. Input shape: {self.model.input_shape}")

        self.is_loaded = True
        logger.info("InferenceService readiness verified.")

    def predict_rul(
        self,
        raw_sequence: List[List[float]],
        feature_names: Optional[List[str]] = None
    ) -> float:
        """
        Executes end-to-end RUL prediction on a 30-cycle x 17-feature raw telemetry sequence.

        Deterministic Preprocessing Pipeline:
          1. Verifies explicit feature order contract against selected_features.json.
          2. Validates array shape (30, 17) and verifies all values are finite.
          3. Formats input into a DataFrame with exact feature names matching the scaler.
          4. Applies fitted StandardScaler transformation (zero refitting).
          5. Casts transformed features to float32 tensor of shape (1, 30, 17).
          6. Executes forward pass through loaded Stacked LSTM network.
          7. Returns predicted scalar Remaining Useful Life (RUL) in cycles.
        """
        if not self.is_loaded or self.model is None or self.scaler is None:
            raise RuntimeError("InferenceService has not been initialized with loaded artifacts.")

        # 1. Feature order protection: verify client feature names match exactly
        if feature_names is not None:
            if feature_names != self.selected_features:
                raise ValueError(
                    f"Feature names or ordering mismatch. "
                    f"Expected 17 features: {self.selected_features}. Received: {feature_names}."
                )

        # 2. Convert to NumPy array and validate shape & finiteness
        arr = np.asarray(raw_sequence, dtype=np.float64)
        if arr.shape != (30, 17):
            raise ValueError(
                f"Input telemetry must have shape (30, 17) [30 cycles x 17 features]. Received {arr.shape}."
            )
        if not np.all(np.isfinite(arr)):
            raise ValueError("Input telemetry contains non-finite values (NaN, Inf, or -Inf).")

        # 3. DataFrame wrapping to preserve feature alignment and suppress name warnings
        df_raw = pd.DataFrame(arr, columns=self.selected_features)

        # 4. Apply fitted StandardScaler
        scaled_arr = self.scaler.transform(df_raw)

        # 5. Format input batch tensor (1, 30, 17) with float32 precision
        tensor_input = np.expand_dims(scaled_arr.astype(np.float32), axis=0)

        # 6. Model forward inference pass
        pred_tensor = self.model(tensor_input, training=False)
        pred_rul = float(pred_tensor.numpy().flatten()[0])

        if not np.isfinite(pred_rul):
            raise ValueError("Model inference produced a non-finite RUL output.")

        return pred_rul
