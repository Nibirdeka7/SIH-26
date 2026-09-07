from fastapi import FastAPI

from app.api.v1.router import router
from app.core.config import settings
from app.core.logging_config import setup_logging


setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered medical document analysis service for MediKiosk",
    debug=settings.DEBUG,
)

app.include_router(
    router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }