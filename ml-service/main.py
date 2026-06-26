from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
)
from services.predictor import PredictionService

prediction_service = PredictionService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    print("Starting OptiRoute ML Service...")
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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        result = prediction_service.predict(request_dict)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "OptiRoute ML Service",
        "version": "1.0.0",
        "endpoints": ["/health", "/predict", "/docs"],
    }
