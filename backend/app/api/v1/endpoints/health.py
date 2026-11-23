from fastapi import APIRouter, HTTPException, Request
from backend.app.schemas.prediction import HealthResponse
from backend.app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health(request: Request):
    """
    Health check endpoint reporting API status and ML artifact readiness.
    """
    service = getattr(request.app.state, "inference_service", None)
    if service is None or not service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Inference service is currently unavailable or artifacts are not loaded."
        )

    return HealthResponse(
        status="healthy",
        model_loaded=service.model is not None,
        scaler_loaded=service.scaler is not None,
        features_loaded=len(service.selected_features) == 17,
        model_name=service.metadata.get("model_name", "Stacked LSTM Network"),
        input_shape=[settings.SEQUENCE_LENGTH, settings.NUM_FEATURES],
        features_count=len(service.selected_features),
        features_list=service.selected_features,
        metadata=service.metadata,
    )
