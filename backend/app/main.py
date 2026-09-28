import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.init_db import init_db
from backend.app.routes import (
    auth,
    machines,
    sensor_data,
    predictions,
    alerts,
    reports,
    dashboard,
    maintenance_logs,
    departments,
    users,
    assistant
)

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("main")

# Setup database and directories on startup
try:
    logger.info("Initializing database and seeding default records...")
    init_db()
    logger.info("Database initialized successfully.")
except Exception as e:
    logger.error(f"Database initialization failed: {str(e)}")

# Create static reports folder if it doesn't exist
static_reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "reports")
os.makedirs(static_reports_dir, exist_ok=True)

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for predicting and managing industrial equipment health.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")), name="static")

# Register routers under settings API prefix
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(machines.router, prefix=api_prefix)
app.include_router(sensor_data.router, prefix=api_prefix)
app.include_router(predictions.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(maintenance_logs.router, prefix=api_prefix)
app.include_router(departments.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(assistant.router, prefix=api_prefix)

# Custom Error Handlers
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the administrator."}
    )

@app.get("/")
def read_root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "healthy",
        "documentation": "/docs",
        "version": "1.0.0"
    }
