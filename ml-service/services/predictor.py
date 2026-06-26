"""
Prediction Service for OptiRoute Risk Prediction
Handles model loading, preprocessing, prediction, and SHAP explanation
"""

import pickle
import json
import numpy as np
import pandas as pd
import os
import time
from typing import Dict, Any
from sklearn.preprocessing import LabelEncoder, StandardScaler

from services.explainer import RiskExplainer


class PredictionService:
    """Production prediction service with model loading and SHAP integration"""

    def __init__(self, models_dir: str = None):
        """
        Initialize prediction service
        
        Args:
            models_dir: Directory containing model and artifacts
        """
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(__file__), "..", "models")

        self.models_dir = models_dir
        self.model = None
        self.label_encoder = None
        self.categorical_encoders = None
        self.scaler = None
        self.feature_columns = []
        self.categorical_features = []
        self.numerical_features = []
        self.target_classes = []
        self.explainer = None
        self.model_version = "v1.0"
        self.is_loaded = False

    def load_model(self) -> bool:
        """
        Load trained model and all required artifacts
        
        Returns:
            True if loading successful, False otherwise
        """
        print("Loading ML model and artifacts...")

        try:
            model_path = os.path.join(self.models_dir, "risk_model.pkl")
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            print(f"  [OK] Loaded model from {model_path}")

            feature_path = os.path.join(self.models_dir, "feature_columns.json")
            with open(feature_path, "r") as f:
                metadata = json.load(f)
                self.feature_columns = metadata["feature_columns"]
                self.categorical_features = metadata["categorical_features"]
                self.numerical_features = metadata["numerical_features"]
                self.target_classes = metadata["target_classes"]
            print(f"  [OK] Loaded {len(self.feature_columns)} features")

            label_encoder_path = os.path.join(self.models_dir, "label_encoder.pkl")
            with open(label_encoder_path, "rb") as f:
                self.label_encoder = pickle.load(f)
            print(f"  [OK] Loaded label encoder")

            categorical_encoders_path = os.path.join(
                self.models_dir, "categorical_encoders.pkl"
            )
            with open(categorical_encoders_path, "rb") as f:
                self.categorical_encoders = pickle.load(f)
            print(f"  [OK] Loaded categorical encoders")

            scaler_path = os.path.join(self.models_dir, "scaler.pkl")
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            print(f"  [OK] Loaded scaler")

            self.explainer = RiskExplainer(models_dir=self.models_dir)
            if not self.explainer.initialize():
                print("  [WARNING] SHAP explainer initialization failed")
                return False
            print(f"  [OK] Initialized SHAP explainer")

            self.is_loaded = True
            print("Model loading complete!")
            return True

        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_loaded = False
            return False

    def validate_request(self, request_data: Dict[str, Any]) -> bool:
        """
        Validate prediction request
        
        Args:
            request_data: Request dictionary
            
        Returns:
            True if valid, False otherwise
        """
        for feature in self.feature_columns:
            if feature not in request_data:
                raise ValueError(f"Missing required feature: {feature}")
        return True

    def preprocess_request(self, request_data: Dict[str, Any]) -> np.ndarray:
        """
        Preprocess request data for model inference
        
        Args:
            request_data: Raw request dictionary
            
        Returns:
            Preprocessed feature array
        """
        df = pd.DataFrame([request_data])

        for feature in self.feature_columns:
            if feature not in df.columns:
                raise ValueError(f"Missing feature: {feature}")

        df = df[self.feature_columns]

        for cat_feature in self.categorical_features:
            if cat_feature in self.categorical_encoders:
                encoder = self.categorical_encoders[cat_feature]
                value = str(df[cat_feature].iloc[0])

                if value in encoder.classes_:
                    df[cat_feature] = encoder.transform([value])
                else:
                    df[cat_feature] = -1
            else:
                df[cat_feature] = 0

        df[self.numerical_features] = self.scaler.transform(df[self.numerical_features])

        return df.values

    def predict(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make prediction with SHAP explanation
        
        Args:
            request_data: Prediction request dictionary
            
        Returns:
            Prediction response dictionary
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        start_time = time.time()

        self.validate_request(request_data)

        X = self.preprocess_request(request_data)

        prediction_encoded = self.model.predict(X)[0]
        predicted_class = self.label_encoder.inverse_transform([prediction_encoded])[0]

        probabilities = self.model.predict_proba(X)[0]
        confidence = float(probabilities[prediction_encoded])

        probabilities_dict = {
            self.target_classes[i]: float(probabilities[i])
            for i in range(len(self.target_classes))
        }

        explanation = self.explainer.explain_prediction(X[0], return_details=False)

        human_explanation = self.explainer.generate_human_explanation(explanation)

        latency_ms = (time.time() - start_time) * 1000

        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "probabilities": probabilities_dict,
            "top_features": explanation["top_features"][:10],
            "positive_contributors": explanation["positive_contributors"][:5],
            "negative_contributors": explanation["negative_contributors"][:5],
            "human_explanation": human_explanation,
            "prediction_latency_ms": round(latency_ms, 2),
        }

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get service health status
        
        Returns:
            Health status dictionary
        """
        return {
            "status": "ok" if self.is_loaded else "not_ready",
            "model_loaded": self.is_loaded,
            "model_version": self.model_version,
            "feature_count": len(self.feature_columns),
        }
