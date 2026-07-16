from fastapi import APIRouter

from app.routes import audit, auth, companies, dashboard, health, monitor, reports, review

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(companies.router)
api_router.include_router(monitor.router)
api_router.include_router(reports.router)
api_router.include_router(review.router)
api_router.include_router(audit.router)

__all__ = ["api_router"]
