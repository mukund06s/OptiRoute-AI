"""
Pydantic schemas for prediction requests and responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional


class PredictionRequest(BaseModel):
    """Request schema for risk prediction"""

    origin_hub: str = Field(..., description="Origin hub name")
    destination_hub: str = Field(..., description="Destination hub name")
    distance_km: float = Field(..., ge=0, le=10000, description="Distance in kilometers")
    duration_minutes: float = Field(..., ge=0, le=10000, description="Duration in minutes")
    road_type: str = Field(..., description="Type of road (highway/expressway/state_road/city_road)")
    weather_condition: str = Field(..., description="Current weather condition")
    traffic_level: str = Field(..., description="Traffic level (low/moderate/high/very_high)")
    shipment_priority: str = Field(..., description="Shipment priority (standard/express/critical)")
    weight_kg: float = Field(..., ge=0, le=50000, description="Weight in kilograms")
    departure_hour: int = Field(..., ge=0, le=23, description="Departure hour (0-23)")
    day_of_week: str = Field(..., description="Day of week")
    historical_delay_minutes: float = Field(..., ge=0, description="Historical average delay minutes")
    current_risk_level: str = Field(..., description="Current risk level (low/medium/high/critical)")
    rerouted_before: bool = Field(..., description="Whether shipment was rerouted before")
    destination_delay_rate: float = Field(..., ge=0, le=1, description="Destination hub delay rate (0-1)")

    @field_validator("road_type")
    @classmethod
    def validate_road_type(cls, v: str) -> str:
        allowed = ["highway", "expressway", "state_road", "city_road"]
        if v not in allowed:
            raise ValueError(f"road_type must be one of {allowed}")
        return v

    @field_validator("weather_condition")
    @classmethod
    def validate_weather(cls, v: str) -> str:
        allowed = [
            "Clear",
            "Partly Cloudy",
            "Cloudy",
            "Light Rain",
            "Rain",
            "Heavy Rain",
            "Thunderstorm",
            "Fog",
        ]
        if v not in allowed:
            raise ValueError(f"weather_condition must be one of {allowed}")
        return v

    @field_validator("traffic_level")
    @classmethod
    def validate_traffic(cls, v: str) -> str:
        allowed = ["low", "moderate", "high", "very_high"]
        if v not in allowed:
            raise ValueError(f"traffic_level must be one of {allowed}")
        return v

    @field_validator("shipment_priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = ["standard", "express", "critical"]
        if v not in allowed:
            raise ValueError(f"shipment_priority must be one of {allowed}")
        return v

    @field_validator("day_of_week")
    @classmethod
    def validate_day(cls, v: str) -> str:
        allowed = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        if v not in allowed:
            raise ValueError(f"day_of_week must be one of {allowed}")
        return v

    @field_validator("current_risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = ["low", "medium", "high", "critical"]
        if v not in allowed:
            raise ValueError(f"current_risk_level must be one of {allowed}")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "origin_hub": "Delhi Warehouse Central",
                "destination_hub": "Bhopal Central Hub",
                "distance_km": 750.5,
                "duration_minutes": 540.0,
                "road_type": "highway",
                "weather_condition": "Heavy Rain",
                "traffic_level": "high",
                "shipment_priority": "express",
                "weight_kg": 1500.0,
                "departure_hour": 14,
                "day_of_week": "Monday",
                "historical_delay_minutes": 45.0,
                "current_risk_level": "medium",
                "rerouted_before": False,
                "destination_delay_rate": 0.25,
            }
        }
    }


class FeatureContribution(BaseModel):
    """Feature contribution in SHAP explanation"""

    feature: str
    contribution: float


class PredictionResponse(BaseModel):
    """Response schema for risk prediction"""

    predicted_class: str = Field(..., description="Predicted risk level (low/medium/high/critical)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")
    probabilities: Dict[str, float] = Field(..., description="Probabilities for all classes")
    top_features: List[FeatureContribution] = Field(..., description="Top contributing features")
    positive_contributors: List[FeatureContribution] = Field(
        ..., description="Features increasing risk"
    )
    negative_contributors: List[FeatureContribution] = Field(
        ..., description="Features decreasing risk"
    )
    human_explanation: str = Field(..., description="Human-readable explanation")
    prediction_latency_ms: float = Field(..., description="Prediction latency in milliseconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "predicted_class": "high",
                "confidence": 0.85,
                "probabilities": {
                    "low": 0.05,
                    "medium": 0.10,
                    "high": 0.85,
                    "critical": 0.00,
                },
                "top_features": [
                    {"feature": "weather_condition", "contribution": 0.42},
                    {"feature": "historical_delay_minutes", "contribution": 0.28},
                    {"feature": "traffic_level", "contribution": 0.18},
                ],
                "positive_contributors": [
                    {"feature": "weather_condition", "contribution": 0.42},
                    {"feature": "historical_delay_minutes", "contribution": 0.28},
                ],
                "negative_contributors": [
                    {"feature": "departure_hour", "contribution": -0.05}
                ],
                "human_explanation": "Risk Level: HIGH (85.0% confidence). Primary factors: weather_condition, historical_delay_minutes, traffic_level.",
                "prediction_latency_ms": 45.3,
            }
        }
    }


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    model_version: str = Field(..., description="Model version")
    feature_count: int = Field(..., description="Number of features")
