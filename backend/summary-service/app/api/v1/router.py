from fastapi import APIRouter
from app.api.v1.endpoints.summary import router as summary_router

router = APIRouter()
router.include_router(summary_router)
