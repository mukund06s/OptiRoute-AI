"""
Feature Engineering Pipeline for OptiRoute ML Service
Loads synthetic dataset and prepares features for model training
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from typing import Tuple, Dict, List


class FeatureEngineer:
    """Feature engineering and preprocessing pipeline"""

    def __init__(self, random_state: int = 42):
        """
        Initialize feature engineer
        
        Args:
            random_state: Random seed for reproducibility
        """
        self.random_state = random_state
        self.label_encoder = LabelEncoder()
        self.categorical_encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.categorical_features = []
        self.numerical_features = []

    def load_data(self, data_path: str) -> pd.DataFrame:
        """
        Load dataset from CSV
        
        Args:
            data_path: Path to CSV file
            
        Returns:
            DataFrame with loaded data
        """
        print(f"Loading data from {data_path}...")
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records with {len(df.columns)} columns")
        return df

    def identify_feature_types(self, df: pd.DataFrame, target_col: str = "risk_level"):
        """
        Identify categorical and numerical features
        
        Args:
            df: Input DataFrame
            target_col: Name of target column to exclude
        """
        exclude_cols = [target_col, "shipment_id"]
        
        self.categorical_features = [
            col
            for col in df.columns
            if col not in exclude_cols
            and (df[col].dtype == "object" or col in [
                "rerouted_before",
                "departure_hour",
                "day_of_week",
            ])
        ]

        self.numerical_features = [
            col
            for col in df.columns
            if col not in exclude_cols
            and col not in self.categorical_features
            and df[col].dtype in ["int64", "float64"]
        ]

        print(f"\nFeature types identified:")
        print(f"  Categorical: {len(self.categorical_features)} features")
        print(f"    {self.categorical_features}")
        print(f"  Numerical: {len(self.numerical_features)} features")
        print(f"    {self.numerical_features}")

    def encode_categorical_features(
        self, df: pd.DataFrame, fit: bool = True
    ) -> pd.DataFrame:
        """
        Encode categorical features using LabelEncoder
        
        Args:
            df: Input DataFrame
            fit: Whether to fit encoders (True for train, False for test)
            
        Returns:
            DataFrame with encoded categorical features
        """
        df_encoded = df.copy()

        for col in self.categorical_features:
            if fit:
                encoder = LabelEncoder()
                df_encoded[col] = encoder.fit_transform(df[col].astype(str))
                self.categorical_encoders[col] = encoder
                print(
                    f"  Encoded {col}: {len(encoder.classes_)} unique values"
                )
            else:
                encoder = self.categorical_encoders[col]
                df_encoded[col] = df[col].apply(
                    lambda x: encoder.transform([str(x)])[0]
                    if str(x) in encoder.classes_
                    else -1
                )

        return df_encoded

    def scale_numerical_features(
        self, df: pd.DataFrame, fit: bool = True
    ) -> pd.DataFrame:
        """
        Scale numerical features using StandardScaler
        
        Args:
            df: Input DataFrame
            fit: Whether to fit scaler (True for train, False for test)
            
        Returns:
            DataFrame with scaled numerical features
        """
        df_scaled = df.copy()

        if fit:
            df_scaled[self.numerical_features] = self.scaler.fit_transform(
                df[self.numerical_features]
            )
            print(f"  Scaled {len(self.numerical_features)} numerical features")
        else:
            df_scaled[self.numerical_features] = self.scaler.transform(
                df[self.numerical_features]
            )

        return df_scaled

    def prepare_features(
        self, df: pd.DataFrame, target_col: str = "risk_level", fit: bool = True
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare feature matrix and target vector
        
        Args:
            df: Input DataFrame
            target_col: Name of target column
            fit: Whether to fit encoders/scalers
            
        Returns:
            Tuple of (X, y) - features and target
        """
        print(f"\nPreparing features (fit={fit})...")

        df_processed = df.copy()

        print("Encoding categorical features...")
        df_processed = self.encode_categorical_features(df_processed, fit=fit)

        print("Scaling numerical features...")
        df_processed = self.scale_numerical_features(df_processed, fit=fit)

        X = df_processed.drop(columns=["shipment_id", target_col])
        y = df_processed[target_col]

        if fit:
            self.feature_columns = list(X.columns)
            print(f"\nFeature matrix shape: {X.shape}")
            print(f"Target vector shape: {y.shape}")

        return X, y

    def encode_target(self, y: pd.Series, fit: bool = True) -> np.ndarray:
        """
        Encode target labels
        
        Args:
            y: Target series
            fit: Whether to fit encoder
            
        Returns:
            Encoded target array
        """
        if fit:
            y_encoded = self.label_encoder.fit_transform(y)
            print(f"\nTarget encoding:")
            for i, label in enumerate(self.label_encoder.classes_):
                count = (y_encoded == i).sum()
                print(f"  {label}: {i} ({count} samples)")
        else:
            y_encoded = self.label_encoder.transform(y)

        return y_encoded

    def split_data(
        self, X: pd.DataFrame, y: np.ndarray, test_size: float = 0.2, val_size: float = 0.15
    ) -> Tuple:
        """
        Split data into train, validation, and test sets
        
        Args:
            X: Feature matrix
            y: Target vector
            test_size: Proportion for test set
            val_size: Proportion of train set for validation
            
        Returns:
            Tuple of (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        print(f"\nSplitting data (test_size={test_size}, val_size={val_size})...")

        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        X_train, X_val, y_train, y_val = train_test_split(
            X_temp,
            y_temp,
            test_size=val_size,
            random_state=self.random_state,
            stratify=y_temp,
        )

        print(f"  Train set: {X_train.shape[0]} samples ({X_train.shape[0]/len(X)*100:.1f}%)")
        print(f"  Validation set: {X_val.shape[0]} samples ({X_val.shape[0]/len(X)*100:.1f}%)")
        print(f"  Test set: {X_test.shape[0]} samples ({X_test.shape[0]/len(X)*100:.1f}%)")

        return X_train, X_val, X_test, y_train, y_val, y_test

    def validate_splits(
        self, y_train: np.ndarray, y_val: np.ndarray, y_test: np.ndarray
    ):
        """
        Validate data splits for class distribution
        
        Args:
            y_train: Training target
            y_val: Validation target
            y_test: Test target
        """
        print("\nValidating split distributions...")

        for split_name, y_split in [
            ("Train", y_train),
            ("Validation", y_val),
            ("Test", y_test),
        ]:
            unique, counts = np.unique(y_split, return_counts=True)
            print(f"  {split_name}:")
            for label, count in zip(unique, counts):
                label_name = self.label_encoder.classes_[label]
                print(f"    {label_name}: {count} ({count/len(y_split)*100:.1f}%)")

    def save_encoders(self, output_dir: str):
        """
        Save encoders for later use
        
        Args:
            output_dir: Directory to save encoders
        """
        os.makedirs(output_dir, exist_ok=True)

        label_encoder_path = os.path.join(output_dir, "label_encoder.pkl")
        with open(label_encoder_path, "wb") as f:
            pickle.dump(self.label_encoder, f)
        print(f"  Saved label encoder to {label_encoder_path}")

        categorical_encoders_path = os.path.join(
            output_dir, "categorical_encoders.pkl"
        )
        with open(categorical_encoders_path, "wb") as f:
            pickle.dump(self.categorical_encoders, f)
        print(f"  Saved categorical encoders to {categorical_encoders_path}")

        scaler_path = os.path.join(output_dir, "scaler.pkl")
        with open(scaler_path, "wb") as f:
            pickle.dump(self.scaler, f)
        print(f"  Saved scaler to {scaler_path}")

    def save_feature_metadata(self, output_dir: str):
        """
        Save feature metadata for later reference
        
        Args:
            output_dir: Directory to save metadata
        """
        os.makedirs(output_dir, exist_ok=True)

        metadata = {
            "feature_columns": self.feature_columns,
            "categorical_features": self.categorical_features,
            "numerical_features": self.numerical_features,
            "target_classes": self.label_encoder.classes_.tolist(),
            "num_features": len(self.feature_columns),
        }

        metadata_path = os.path.join(output_dir, "feature_columns.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"  Saved feature metadata to {metadata_path}")


def main():
    """Main function to run feature engineering pipeline"""
    print("=" * 60)
    print("OptiRoute Feature Engineering Pipeline")
    print("=" * 60)

    data_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "training_data.csv"
    )

    engineer = FeatureEngineer(random_state=42)

    df = engineer.load_data(data_path)

    engineer.identify_feature_types(df)

    X, y = engineer.prepare_features(df, target_col="risk_level", fit=True)

    y_encoded = engineer.encode_target(y, fit=True)

    X_train, X_val, X_test, y_train, y_val, y_test = engineer.split_data(
        X, y_encoded, test_size=0.2, val_size=0.15
    )

    engineer.validate_splits(y_train, y_val, y_test)

    output_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    print(f"\nSaving encoders and metadata to {output_dir}...")
    engineer.save_encoders(output_dir)
    engineer.save_feature_metadata(output_dir)

    print("\n" + "=" * 60)
    print("[SUCCESS] Feature engineering complete!")
    print("=" * 60)
    print(f"Total features: {len(engineer.feature_columns)}")
    print(f"Categorical features: {len(engineer.categorical_features)}")
    print(f"Numerical features: {len(engineer.numerical_features)}")
    print(f"Target classes: {len(engineer.label_encoder.classes_)}")
    print(f"\nTrain: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    print("\nReady for model training in next phase!")


if __name__ == "__main__":
    main()
