import logging
from fastapi import APIRouter, HTTPException, Request
from backend.app.schemas.telemetry import TelemetrySequenceRequest
from backend.app.schemas.prediction import PredictionResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
def predict_remaining_useful_life(payload: TelemetrySequenceRequest, request: Request):
    """
    Generates Remaining Useful Life (RUL) prediction for a 30-cycle x 17-feature telemetry window.
    Requires explicit feature_names order verification.
    """
    service = getattr(request.app.state, "inference_service", None)
    if service is None or not service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Inference service is not initialized or model artifacts are unavailable."
        )

    try:
        predicted_rul = service.predict_rul(payload.sequence, feature_names=payload.feature_names)
        return PredictionResponse(
            predicted_rul=predicted_rul,
            unit="cycles",
            model_name=service.metadata.get("model_name", "Stacked LSTM Network"),
            sequence_length=30,
            feature_count=17,
            status="success",
            disclaimer="Research & demonstration estimate based on NASA C-MAPSS FD001. Not for operational flight dispatch.",
        )
    except ValueError as e:
        # Client validation / feature mismatch error: return descriptive HTTP 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected internal error: log full stack trace internally and mask external response
        logger.exception("Unexpected inference error during model evaluation.")
        raise HTTPException(
            status_code=500,
            detail="Internal inference evaluation error. Please review server logs."
        )
