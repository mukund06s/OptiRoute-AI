"""
Test script for FastAPI prediction service
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001"


def test_health():
    """Test health endpoint"""
    print("=" * 60)
    print("TEST 1: Health Endpoint")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Status: {data['status']}")
        print(f"Model Loaded: {data['model_loaded']}")
        print(f"Model Version: {data['model_version']}")
        print(f"Feature Count: {data['feature_count']}")
        print("[OK] Health check passed")
    else:
        print("[FAIL] Health check failed")
    
    print()


def test_prediction(name: str, request_data: dict):
    """Test prediction endpoint"""
    print("=" * 60)
    print(f"TEST: {name}")
    print("=" * 60)
    
    start = time.time()
    response = requests.post(f"{BASE_URL}/predict", json=request_data)
    elapsed_ms = (time.time() - start) * 1000
    
    print(f"Status Code: {response.status_code}")
    print(f"Total Request Time: {elapsed_ms:.2f}ms")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Predicted Class: {data['predicted_class']}")
        print(f"Confidence: {data['confidence']:.4f}")
        print(f"Prediction Latency: {data['prediction_latency_ms']}ms")
        print(f"Top 3 Features:")
        for feat in data['top_features'][:3]:
            print(f"  - {feat['feature']}: {feat['contribution']:.4f}")
        print(f"Human Explanation: {data['human_explanation'][:100]}...")
        print("[OK] Prediction successful")
    else:
        print(f"[FAIL] {response.json()}")
    
    print()


def test_invalid_request():
    """Test invalid request handling"""
    print("=" * 60)
    print("TEST: Invalid Request (Missing Fields)")
    print("=" * 60)
    
    invalid_data = {
        "origin_hub": "Delhi Warehouse Central",
        "destination_hub": "Bhopal Central Hub",
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=invalid_data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 422:
        print("[OK] Validation error returned as expected")
    else:
        print("[FAIL] Expected 422 validation error")
    
    print()


def test_invalid_categorical():
    """Test invalid categorical value"""
    print("=" * 60)
    print("TEST: Invalid Categorical Value")
    print("=" * 60)
    
    invalid_data = {
        "origin_hub": "Delhi Warehouse Central",
        "destination_hub": "Bhopal Central Hub",
        "distance_km": 750.5,
        "duration_minutes": 540.0,
        "road_type": "invalid_road",
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
    
    response = requests.post(f"{BASE_URL}/predict", json=invalid_data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 422:
        print("[OK] Validation error for invalid categorical")
    else:
        print("[FAIL] Expected 422 validation error")
    
    print()


def main():
    """Run all tests"""
    print("\n")
    print("*" * 60)
    print("OptiRoute ML Service - API Tests")
    print("*" * 60)
    print("\n")
    
    test_health()
    
    high_risk_request = {
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
    test_prediction("High Risk Prediction", high_risk_request)
    
    low_risk_request = {
        "origin_hub": "Delhi Warehouse Central",
        "destination_hub": "Agra Transit Hub",
        "distance_km": 200.0,
        "duration_minutes": 180.0,
        "road_type": "expressway",
        "weather_condition": "Clear",
        "traffic_level": "low",
        "shipment_priority": "standard",
        "weight_kg": 500.0,
        "departure_hour": 8,
        "day_of_week": "Wednesday",
        "historical_delay_minutes": 5.0,
        "current_risk_level": "low",
        "rerouted_before": False,
        "destination_delay_rate": 0.05,
    }
    test_prediction("Low Risk Prediction", low_risk_request)
    
    critical_risk_request = {
        "origin_hub": "Delhi Warehouse Central",
        "destination_hub": "Indore Delivery Hub",
        "distance_km": 850.0,
        "duration_minutes": 720.0,
        "road_type": "state_road",
        "weather_condition": "Thunderstorm",
        "traffic_level": "very_high",
        "shipment_priority": "critical",
        "weight_kg": 3000.0,
        "departure_hour": 22,
        "day_of_week": "Friday",
        "historical_delay_minutes": 120.0,
        "current_risk_level": "high",
        "rerouted_before": True,
        "destination_delay_rate": 0.45,
    }
    test_prediction("Critical Risk Prediction", critical_risk_request)
    
    test_invalid_request()
    test_invalid_categorical()
    
    print("\n")
    print("*" * 60)
    print("[SUCCESS] All Tests Complete!")
    print("*" * 60)
    print("\n")


if __name__ == "__main__":
    main()
