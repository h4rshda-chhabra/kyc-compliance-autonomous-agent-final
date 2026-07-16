from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.middleware import RequestLoggingMiddleware
from app.orchestrator import start_scheduler, stop_scheduler
from app.routes import api_router

settings = get_settings()
configure_logging()
logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (%s)", settings.app_name, settings.environment)
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)
