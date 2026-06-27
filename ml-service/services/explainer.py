"""
SHAP Explainability Service for OptiRoute ML Model
Provides interpretable explanations for risk predictions
"""

import pickle
import json
import numpy as np
import pandas as pd
import shap
import os
from typing import Dict, List, Tuple, Optional


class RiskExplainer:
    """SHAP-based explainability service for risk predictions"""

    def __init__(self, models_dir: str = None):
        """
        Initialize SHAP explainer
        
        Args:
            models_dir: Directory containing model and metadata files
        """
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(__file__), "..", "models")

        self.models_dir = models_dir
        self.model = None
        self.explainer = None
        self.feature_columns = []
        self.label_encoder = None
        self.target_classes = []

    def initialize(self, model=None, label_encoder=None, feature_columns=None, target_classes=None) -> bool:
        """
        Initialize SHAP explainer using shared model artifacts when provided.
        
        Returns:
            True if initialization successful
        """
        if model is not None and label_encoder is not None:
            self.model = model
            self.label_encoder = label_encoder
            self.feature_columns = feature_columns or []
            self.target_classes = target_classes or []
            self.explainer = shap.TreeExplainer(self.model)
            return True

        print("Initializing SHAP explainer...")

        try:
            model_path = os.path.join(self.models_dir, "risk_model.pkl")
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            print(f"  Loaded model from {model_path}")

            metadata_path = os.path.join(self.models_dir, "feature_columns.json")
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
                self.feature_columns = metadata["feature_columns"]
                self.target_classes = metadata["target_classes"]
            print(f"  Loaded {len(self.feature_columns)} features")

            label_encoder_path = os.path.join(self.models_dir, "label_encoder.pkl")
            with open(label_encoder_path, "rb") as f:
                self.label_encoder = pickle.load(f)
            print(f"  Loaded label encoder")

            self.explainer = shap.TreeExplainer(self.model)
            print(f"  Initialized SHAP TreeExplainer")

            print("SHAP explainer ready!")
            return True

        except Exception as e:
            print(f"Error initializing explainer: {e}")
            return False

    def explain_from_prediction(
        self,
        X: np.ndarray,
        prediction_encoded: int,
        confidence: float,
        return_details: bool = False,
    ) -> Dict:
        """
        Explain a prediction using precomputed class index (skips duplicate inference).
        """
        if X.ndim == 1:
            X = X.reshape(1, -1)

        predicted_class = self.label_encoder.inverse_transform([prediction_encoded])[0]
        shap_values = self.explainer.shap_values(X)

        if isinstance(shap_values, list):
            shap_values_for_prediction = shap_values[prediction_encoded][0]
        else:
            if shap_values.ndim == 3:
                shap_values_for_prediction = shap_values[0, :, prediction_encoded]
            else:
                shap_values_for_prediction = shap_values[0]

        feature_contributions = dict(
            zip(self.feature_columns, shap_values_for_prediction)
        )

        sorted_contributions = sorted(
            feature_contributions.items(), key=lambda x: abs(x[1]), reverse=True
        )

        top_features = [
            {"feature": feat, "contribution": float(contrib)}
            for feat, contrib in sorted_contributions[:10]
        ]

        positive_contributors = [
            {"feature": feat, "contribution": float(contrib)}
            for feat, contrib in sorted_contributions
            if contrib > 0
        ][:5]

        negative_contributors = [
            {"feature": feat, "contribution": float(contrib)}
            for feat, contrib in sorted(
                [(f, c) for f, c in feature_contributions.items() if c < 0],
                key=lambda x: x[1],
            )
        ][:5]

        explanation = {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "top_features": top_features,
            "positive_contributors": positive_contributors,
            "negative_contributors": negative_contributors,
        }

        if return_details:
            explanation["raw_shap_values"] = {
                feat: float(val) for feat, val in feature_contributions.items()
            }
            explanation["base_value"] = float(
                self.explainer.expected_value[prediction_encoded]
                if isinstance(self.explainer.expected_value, (list, np.ndarray))
                else self.explainer.expected_value
            )

        return explanation

    def explain_prediction(
        self, X: np.ndarray, return_details: bool = True
    ) -> Dict:
        """
        Explain a single prediction with SHAP values
        
        Args:
            X: Feature vector (1D array or 2D array with 1 row)
            return_details: Whether to include detailed explanation
            
        Returns:
            Dictionary with prediction and explanation
        """
        if X.ndim == 1:
            X = X.reshape(1, -1)

        prediction_encoded = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        confidence = float(probabilities[prediction_encoded])

        explanation = self.explain_from_prediction(
            X[0],
            prediction_encoded,
            confidence,
            return_details=return_details,
        )

        if return_details:
            explanation["probabilities"] = {
                self.target_classes[i]: float(probabilities[i])
                for i in range(len(self.target_classes))
            }

        return explanation

    def explain_batch(
        self, X: np.ndarray, return_summary: bool = True
    ) -> List[Dict]:
        """
        Explain multiple predictions
        
        Args:
            X: Feature matrix (2D array)
            return_summary: Whether to include batch summary
            
        Returns:
            List of explanations for each prediction
        """
        print(f"Explaining batch of {len(X)} predictions...")

        explanations = []
        for i in range(len(X)):
            explanation = self.explain_prediction(X[i], return_details=False)
            explanation["sample_id"] = i
            explanations.append(explanation)

        if return_summary:
            summary = self._generate_batch_summary(explanations)
            return {"explanations": explanations, "summary": summary}

        return explanations

    def _generate_batch_summary(self, explanations: List[Dict]) -> Dict:
        """Generate summary statistics for batch explanations"""
        predicted_classes = [exp["predicted_class"] for exp in explanations]
        class_counts = {}
        for cls in self.target_classes:
            class_counts[cls] = predicted_classes.count(cls)

        avg_confidence = np.mean([exp["confidence"] for exp in explanations])

        all_features = {}
        for exp in explanations:
            for feat_info in exp["top_features"]:
                feat = feat_info["feature"]
                contrib = abs(feat_info["contribution"])
                if feat not in all_features:
                    all_features[feat] = []
                all_features[feat].append(contrib)

        avg_feature_importance = {
            feat: float(np.mean(contribs)) for feat, contribs in all_features.items()
        }
        top_batch_features = sorted(
            avg_feature_importance.items(), key=lambda x: x[1], reverse=True
        )[:10]

        return {
            "total_predictions": len(explanations),
            "class_distribution": class_counts,
            "average_confidence": float(avg_confidence),
            "top_batch_features": [
                {"feature": feat, "avg_contribution": contrib}
                for feat, contrib in top_batch_features
            ],
        }

    def get_top_features(
        self, explanation: Dict, n: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Extract top N features from explanation
        
        Args:
            explanation: Explanation dictionary
            n: Number of top features to return
            
        Returns:
            List of (feature_name, contribution) tuples
        """
        top_features = explanation.get("top_features", [])[:n]
        return [(f["feature"], f["contribution"]) for f in top_features]

    def get_global_importance(self, X: np.ndarray, max_samples: int = 1000) -> Dict:
        """
        Calculate global feature importance using SHAP
        
        Args:
            X: Feature matrix (sample from training/test data)
            max_samples: Maximum samples to use for calculation
            
        Returns:
            Dictionary with global importance metrics
        """
        print(f"Calculating global feature importance...")

        if len(X) > max_samples:
            indices = np.random.choice(len(X), max_samples, replace=False)
            X_sample = X[indices]
        else:
            X_sample = X

        shap_values = self.explainer.shap_values(X_sample)

        if isinstance(shap_values, list):
            mean_abs_shap = np.mean(
                [np.abs(sv).mean(axis=0) for sv in shap_values], axis=0
            )
        else:
            if shap_values.ndim == 3:
                mean_abs_shap = np.abs(shap_values).mean(axis=(0, 2))
            else:
                mean_abs_shap = np.abs(shap_values).mean(axis=0)

        mean_abs_shap = np.array(mean_abs_shap).flatten()
        feature_importance = dict(zip(self.feature_columns, mean_abs_shap))
        sorted_importance = sorted(
            feature_importance.items(), key=lambda x: x[1], reverse=True
        )

        top_10_features = [
            {"feature": feat, "importance": float(imp)}
            for feat, imp in sorted_importance[:10]
        ]

        print(f"\nTop 10 globally important features:")
        for i, feat_info in enumerate(top_10_features, 1):
            print(f"  {i}. {feat_info['feature']}: {feat_info['importance']:.4f}")

        return {
            "global_importance": {
                feat: float(imp) for feat, imp in feature_importance.items()
            },
            "top_10_features": top_10_features,
            "mean_abs_shap": float(mean_abs_shap.mean()),
        }

    def save_explanation(
        self, explanation: Dict, output_path: str, pretty: bool = True
    ):
        """
        Save explanation to JSON file
        
        Args:
            explanation: Explanation dictionary
            output_path: Path to save JSON file
            pretty: Whether to format JSON with indentation
        """
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        with open(output_path, "w") as f:
            if pretty:
                json.dump(explanation, f, indent=2)
            else:
                json.dump(explanation, f)

        print(f"Explanation saved to {output_path}")

    def generate_human_explanation(self, explanation: Dict) -> str:
        """
        Generate human-readable explanation text
        
        Args:
            explanation: Explanation dictionary
            
        Returns:
            Human-readable explanation string
        """
        predicted_class = explanation["predicted_class"]
        confidence = explanation["confidence"] * 100

        top_features = explanation["top_features"][:3]
        top_factors = ", ".join([f["feature"] for f in top_features])

        text = f"Risk Level: {predicted_class.upper()} ({confidence:.1f}% confidence). "
        text += f"Primary factors: {top_factors}. "

        if explanation.get("positive_contributors"):
            pos_contrib = explanation["positive_contributors"][0]
            text += f"Main risk driver: {pos_contrib['feature']}. "

        return text


def main():
    """Test SHAP explainer functionality"""
    print("=" * 60)
    print("SHAP Explainer Test")
    print("=" * 60)

    explainer = RiskExplainer()

    if not explainer.initialize():
        print("Failed to initialize explainer!")
        return

    print("\nGenerating sample test data...")
    test_data_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "training_data.csv"
    )
    df = pd.read_csv(test_data_path)

    feature_cols = explainer.feature_columns
    X_raw = df[feature_cols].head(5)

    from sklearn.preprocessing import LabelEncoder, StandardScaler

    encoders = {}
    for col in feature_cols:
        if df[col].dtype == "object" or col in [
            "rerouted_before",
            "departure_hour",
            "day_of_week",
        ]:
            encoder = LabelEncoder()
            X_raw[col] = encoder.fit_transform(df[col].head(5).astype(str))

    numerical_cols = [
        "distance_km",
        "duration_minutes",
        "weight_kg",
        "historical_delay_minutes",
        "destination_delay_rate",
    ]
    scaler = StandardScaler()
    X_raw[numerical_cols] = scaler.fit_transform(X_raw[numerical_cols])

    X_test = X_raw.values

    print("\n[TEST 1: Single Prediction Explanation]")
    explanation = explainer.explain_prediction(X_test[0])
    print(f"Predicted: {explanation['predicted_class']}")
    print(f"Confidence: {explanation['confidence']:.4f}")
    print(f"Top 3 features:")
    for feat in explanation["top_features"][:3]:
        print(f"  - {feat['feature']}: {feat['contribution']:.4f}")

    print("\n[TEST 2: Human-Readable Explanation]")
    human_text = explainer.generate_human_explanation(explanation)
    print(f"  {human_text}")

    print("\n[TEST 3: Batch Explanation]")
    batch_result = explainer.explain_batch(X_test)
    print(f"Explained {batch_result['summary']['total_predictions']} predictions")
    print(f"Class distribution: {batch_result['summary']['class_distribution']}")

    print("\n[TEST 4: Global Feature Importance]")
    global_importance = explainer.get_global_importance(X_test)

    print("\n[TEST 5: Save Explanation]")
    output_path = os.path.join(
        os.path.dirname(__file__), "..", "explanations", "sample_explanation.json"
    )
    explainer.save_explanation(explanation, output_path)

    print("\n" + "=" * 60)
    print("[SUCCESS] SHAP Explainer Tests Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
