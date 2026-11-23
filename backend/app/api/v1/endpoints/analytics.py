import logging
from fastapi import APIRouter, HTTPException, Request

from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TestParityResponse,
)
from backend.app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)
router = APIRouter()

# Default fallback service instance if not injected into app.state
_default_analytics_service = AnalyticsService()


def _get_analytics_service(request: Request) -> AnalyticsService:
    return getattr(request.app.state, "analytics_service", _default_analytics_service)


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(request: Request):
    """
    Returns structured model analytics overview:
      - Dataset and evaluation protocol provenance.
      - 5-model benchmark matrix and selection rationale.
      - Exact Stacked LSTM and 1D-CNN neural network architectures and layer breakdown.
      - Random Forest specified hyperparameters and defaults.
      - Exact Stacked LSTM training history across all 12 epochs.
      - Production artifact filesystem verification and byte sizes.
      - Formal NASA scoring formula and asymmetry interpretation.
      - Separate validation (N=3,490) and held-out test (N=100) performance metrics.
    """
    service = _get_analytics_service(request)
    inference_service = getattr(request.app.state, "inference_service", None)

    try:
        return service.get_overview(inference_service=inference_service)
    except Exception as e:
        logger.exception("Unexpected error compiling analytics overview.")
        raise HTTPException(
            status_code=500,
            detail="Internal server error compiling analytics overview."
        )


@router.get("/test-parity", response_model=TestParityResponse)
async def get_test_parity(request: Request):
    """
    Returns 100 held-out test parity records (one per test engine):
      - engine_id (1 to 100)
      - actual_rul from RUL_FD001.txt
      - predicted_rul generated from the engine's final 30 telemetry cycles
      - residual (predicted_rul - actual_rul)
    Computations are cached after first execution with asynchronous lock safety.
    """
    inference_service = getattr(request.app.state, "inference_service", None)
    fleet_service = getattr(request.app.state, "fleet_service", None)

    if inference_service is None or not inference_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Inference service is unavailable or model artifacts are not loaded."
        )
    if fleet_service is None or not fleet_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Fleet service is unavailable or test dataset is not loaded."
        )

    service = _get_analytics_service(request)

    try:
        return await service.get_test_parity(
            inference_service=inference_service,
            fleet_service=fleet_service
        )
    except FileNotFoundError as e:
        logger.error(f"Held-out test labels missing: {e}")
        raise HTTPException(
            status_code=500,
            detail="Held-out test ground truth dataset is unavailable on the server."
        )
    except Exception as e:
        logger.exception("Unexpected error computing held-out test parity dataset.")
        raise HTTPException(
            status_code=500,
            detail="Internal error generating held-out test parity dataset."
        )
