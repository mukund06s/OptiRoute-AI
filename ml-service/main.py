import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
)
from services.predictor import PredictionService

prediction_service = PredictionService()


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > settings.max_request_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request entity too large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"},
                )
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    print(f"Starting OptiRoute ML Service ({settings.node_env})...")
    success = prediction_service.load_model()
    if not success:
        print("WARNING: Failed to load model during startup")
    yield
    print("Shutting down OptiRoute ML Service...")


app = FastAPI(
    title="OptiRoute ML Service",
    description="Risk prediction and SHAP explainability microservice",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(RequestSizeLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if not settings.is_production:
        print(f"[ML Service Error] {request.method} {request.url.path}: {exc}")

    if settings.is_production:
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)},
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    
    Returns service status and model loading state
    """
    health_status = prediction_service.get_health_status()
    return health_status


@app.post("/predict", response_model=PredictionResponse)
async def predict_risk(request: PredictionRequest):
    """
    Predict risk level with SHAP explanation
    
    Args:
        request: Prediction request with all required features
        
    Returns:
        Prediction response with class, confidence, probabilities, and SHAP explanation
    """
    if not prediction_service.is_loaded:
        raise HTTPException(
            status_code=503, detail="Model not loaded. Service not ready."
        )

    try:
        request_dict = request.model_dump()
        result = await asyncio.to_thread(prediction_service.predict, request_dict)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        if settings.is_production:
            raise HTTPException(status_code=500, detail="Prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "OptiRoute ML Service",
        "version": "1.0.0",
        "endpoints": ["/health", "/predict"] + ([] if settings.is_production else ["/docs"]),
    }
