import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request

from backend.app.schemas.fleet import (
    FleetOverviewResponse,
    EngineSummaryResponse,
    EngineTelemetryResponse,
    EngineReplayResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=FleetOverviewResponse)
def get_fleet_overview(request: Request):
    """
    Returns high-level status of the entire 100-engine fleet:
    total engine count, engine IDs, total records, and per-engine cycle counts.
    """
    service = getattr(request.app.state, "fleet_service", None)
    if service is None or not service.is_loaded:
        raise HTTPException(status_code=503, detail="Fleet service is unavailable or data is not loaded.")

    try:
        return service.get_fleet_overview()
    except Exception as e:
        logger.exception("Unexpected error fetching fleet overview.")
        raise HTTPException(status_code=500, detail="Internal server error fetching fleet overview.")

@router.get("/{engine_id}", response_model=EngineSummaryResponse)
def get_engine_summary(engine_id: int, request: Request):
    """
    Returns summary metrics for a specific aircraft engine:
    total recorded cycles, first/last cycle, latest sensor readings, and prediction-readiness.
    """
    service = getattr(request.app.state, "fleet_service", None)
    if service is None or not service.is_loaded:
        raise HTTPException(status_code=503, detail="Fleet service is unavailable or data is not loaded.")

    try:
        return service.get_engine_summary(engine_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error fetching summary for Engine {engine_id}.")
        raise HTTPException(status_code=500, detail=f"Internal server error fetching Engine {engine_id} summary.")

@router.get("/{engine_id}/telemetry", response_model=EngineTelemetryResponse)
def get_engine_telemetry(
    engine_id: int,
    request: Request,
    start_cycle: Optional[int] = Query(None, description="Start cycle for telemetry filtering."),
    end_cycle: Optional[int] = Query(None, description="End cycle for telemetry filtering."),
):
    """
    Returns chronological telemetry records for an engine with optional cycle range filtering.
    """
    service = getattr(request.app.state, "fleet_service", None)
    if service is None or not service.is_loaded:
        raise HTTPException(status_code=503, detail="Fleet service is unavailable or data is not loaded.")

    try:
        return service.get_engine_telemetry(engine_id, start_cycle=start_cycle, end_cycle=end_cycle)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error fetching telemetry for Engine {engine_id}.")
        raise HTTPException(status_code=500, detail=f"Internal server error fetching Engine {engine_id} telemetry.")

@router.get("/{engine_id}/replay", response_model=EngineReplayResponse)
def get_engine_replay_window(
    engine_id: int,
    request: Request,
    end_cycle: Optional[int] = Query(None, description="End cycle of 30-cycle window (defaults to latest recorded cycle)."),
    predict: bool = Query(False, description="If True, executes RUL inference on this 30-cycle window using the loaded LSTM model.")
):
    """
    Extracts a 30-cycle telemetry window suitable for RUL inference or timeline playback.
    Optionally computes the predicted RUL internally if predict=True.
    """
    fleet_service = getattr(request.app.state, "fleet_service", None)
    if fleet_service is None or not fleet_service.is_loaded:
        raise HTTPException(status_code=503, detail="Fleet service is unavailable or data is not loaded.")

    try:
        replay_data = fleet_service.get_engine_replay_window(engine_id, end_cycle=end_cycle)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error extracting replay window for Engine {engine_id}.")
        raise HTTPException(status_code=500, detail=f"Internal server error extracting Engine {engine_id} replay.")

    # Optional internal prediction integration
    if predict:
        inference_service = getattr(request.app.state, "inference_service", None)
        if inference_service is None or not inference_service.is_loaded:
            raise HTTPException(status_code=503, detail="Inference service is unavailable for prediction.")
        try:
            pred_rul = inference_service.predict_rul(
                replay_data["sequence"],
                feature_names=replay_data["feature_names"]
            )
            replay_data["predicted_rul"] = pred_rul
        except Exception as e:
            logger.exception(f"Inference evaluation failed during replay for Engine {engine_id}.")
            raise HTTPException(status_code=500, detail="Internal error generating replay prediction.")

    return replay_data
