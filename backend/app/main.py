import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure both project root and backend dir are in sys.path
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent
_project_root = _backend_dir.parent

for _p in [str(_project_root), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.services.inference_service import InferenceService
from backend.app.services.fleet_service import FleetService
from backend.app.api.v1.router import api_router

# Setup application logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    1. Loads Keras model, fitted scaler, selected features, and metadata once on startup.
    2. Loads and indexes 100 test engines from test_FD001.txt into memory once on startup.
    Ensures zero reload overhead on individual API requests.
    """
    # 1. Initialize Inference Service
    inf_service = InferenceService(
        model_path=settings.MODEL_PATH,
        scaler_path=settings.SCALER_PATH,
        features_path=settings.FEATURES_PATH,
        metadata_path=settings.METADATA_PATH,
    )
    inf_service.load_artifacts()
    app.state.inference_service = inf_service

    # 2. Initialize Fleet Management Service (Reads only test_FD001.txt; NEVER reads RUL_FD001.txt)
    flt_service = FleetService(
        test_data_path=settings.TEST_DATA_PATH,
        features_path=settings.FEATURES_PATH,
    )
    flt_service.load_data()
    app.state.fleet_service = flt_service

    yield

    # Graceful shutdown
    app.state.inference_service = None
    app.state.fleet_service = None

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="TURBOGUARD AI — High-reliability predictive maintenance API for NASA C-MAPSS FD001 turbofan fleet.",
    lifespan=lifespan,
)

# Configure CORS for dashboard communication (without wildcard credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
def root_status():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "documentation": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "fleet_overview": f"{settings.API_V1_STR}/fleet"
    }
