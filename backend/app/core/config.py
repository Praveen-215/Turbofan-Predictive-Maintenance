import os
from pathlib import Path
from typing import List

class Settings:
    """
    Application configuration with robust project-root relative artifact resolution.
    Avoids reliance on current working directory.
    """
    PROJECT_NAME: str = "TURBOGUARD AI Backend"
    API_V1_STR: str = "/api/v1"

    # Path(__file__) is backend/app/core/config.py
    # parents[3] is the project root (/Users/.../Turbofan-Predictive-Maintenance)
    BASE_DIR: Path = Path(__file__).resolve().parents[3]

    # Production ML Artifact paths
    MODELS_DIR: Path = BASE_DIR / "models"
    MODEL_PATH: Path = MODELS_DIR / "stacked_lstm_fd001.keras"
    SCALER_PATH: Path = MODELS_DIR / "standard_scaler_fd001.pkl"
    FEATURES_PATH: Path = MODELS_DIR / "selected_features.json"
    METADATA_PATH: Path = MODELS_DIR / "model_metadata.json"

    # Telemetry Data paths (Raw C-MAPSS FD001 test telemetry for fleet simulation)
    DATA_DIR: Path = BASE_DIR / "data" / "raw" / "CMaps"
    TEST_DATA_PATH: Path = DATA_DIR / "test_FD001.txt"

    # Sequence specifications for NASA C-MAPSS FD001 Stacked LSTM
    SEQUENCE_LENGTH: int = 30
    NUM_FEATURES: int = 17

    # Configurable CORS origins for React frontend (avoids unrestricted wildcard with credentials)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    def __init__(self):
        env_origins = os.getenv("CORS_ORIGINS")
        if env_origins:
            self.CORS_ORIGINS = [o.strip() for o in env_origins.split(",") if o.strip()]

settings = Settings()
