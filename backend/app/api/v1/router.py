from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, predict, fleet, analytics

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(predict.router, tags=["Inference"])
api_router.include_router(fleet.router, prefix="/fleet", tags=["Fleet Management"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Model Analytics"])
