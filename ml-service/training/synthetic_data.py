"""
Synthetic Dataset Generator for OptiRoute ML Service
Generates realistic logistics shipment data for model training
"""

import numpy as np
import pandas as pd
from typing import Optional
import os


class SyntheticDataGenerator:
    """Generate synthetic logistics dataset with realistic distributions"""

    def __init__(self, seed: int = 42):
        """
        Initialize generator with random seed for reproducibility
        
        Args:
            seed: Random seed for numpy random number generator
        """
        self.seed = seed
        np.random.seed(seed)

        # Hub names from real data
        self.hubs = [
            "Delhi Warehouse Central",
            "Agra Transit Hub",
            "Gwalior Transit Hub",
            "Jhansi Hub",
            "Bhopal Central Hub",
            "Jaipur Warehouse",
            "Kota Transit Hub",
            "Indore Delivery Hub",
            "Ujjain Hub",
        ]

        # Define realistic value ranges
        self.road_types = ["highway", "expressway", "state_road", "city_road"]
        self.weather_conditions = [
            "Clear",
            "Partly Cloudy",
            "Cloudy",
            "Light Rain",
            "Rain",
            "Heavy Rain",
            "Thunderstorm",
            "Fog",
        ]
        self.traffic_levels = ["low", "moderate", "high", "very_high"]
        self.priorities = ["standard", "express", "critical"]
        self.days_of_week = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]

    def generate_dataset(self, num_samples: int = 10000) -> pd.DataFrame:
        """
        Generate synthetic logistics dataset
        
        Args:
            num_samples: Number of records to generate
            
        Returns:
            DataFrame with synthetic shipment data
        """
        print(f"Generating {num_samples} synthetic shipment records...")

        data = {
            "shipment_id": self._generate_shipment_ids(num_samples),
            "origin_hub": self._generate_hubs(num_samples),
            "destination_hub": [],
            "distance_km": [],
            "duration_minutes": [],
            "road_type": np.random.choice(self.road_types, num_samples),
            "weather_condition": np.random.choice(
                self.weather_conditions,
                num_samples,
                p=[0.25, 0.20, 0.15, 0.12, 0.10, 0.08, 0.05, 0.05],
            ),
            "traffic_level": np.random.choice(
                self.traffic_levels, num_samples, p=[0.30, 0.35, 0.25, 0.10]
            ),
            "shipment_priority": np.random.choice(
                self.priorities, num_samples, p=[0.70, 0.20, 0.10]
            ),
            "weight_kg": np.round(np.random.uniform(1.0, 500.0, num_samples), 2),
            "departure_hour": np.random.randint(0, 24, num_samples),
            "day_of_week": np.random.choice(self.days_of_week, num_samples),
            "historical_delay_minutes": [],
            "current_risk_level": [],
            "rerouted_before": np.random.choice([0, 1], num_samples, p=[0.85, 0.15]),
            "destination_delay_rate": [],
        }

        for i in range(num_samples):
            origin = data["origin_hub"][i]
            destination = self._generate_different_hub(origin)
            data["destination_hub"].append(destination)

            distance = self._generate_distance()
            data["distance_km"].append(distance)

            road_type = data["road_type"][i]
            duration = self._calculate_duration(distance, road_type)
            data["duration_minutes"].append(duration)

            weather = data["weather_condition"][i]
            traffic = data["traffic_level"][i]
            historical_delay = self._generate_historical_delay(weather, traffic)
            data["historical_delay_minutes"].append(historical_delay)

            current_risk = self._determine_current_risk(
                weather, traffic, data["departure_hour"][i]
            )
            data["current_risk_level"].append(current_risk)

            delay_rate = self._generate_destination_delay_rate()
            data["destination_delay_rate"].append(delay_rate)

        df = pd.DataFrame(data)

        df["risk_level"] = df.apply(self._generate_risk_label, axis=1)

        print(f"Dataset generated successfully: {len(df)} records")
        return df

    def _generate_shipment_ids(self, n: int) -> list:
        """Generate unique shipment IDs"""
        return [f"SHIP-{10000 + i}" for i in range(n)]

    def _generate_hubs(self, n: int) -> list:
        """Generate random hub names"""
        return list(np.random.choice(self.hubs, n))

    def _generate_different_hub(self, origin: str) -> str:
        """Generate destination hub different from origin"""
        available = [h for h in self.hubs if h != origin]
        return np.random.choice(available)

    def _generate_distance(self) -> float:
        """Generate realistic distance between hubs (50-1000 km)"""
        return round(np.random.uniform(50, 1000), 2)

    def _calculate_duration(self, distance_km: float, road_type: str) -> int:
        """Calculate duration based on distance and road type"""
        avg_speed = {
            "highway": 80,
            "expressway": 100,
            "state_road": 60,
            "city_road": 40,
        }
        speed = avg_speed.get(road_type, 60)
        base_duration = (distance_km / speed) * 60
        variation = np.random.uniform(0.8, 1.2)
        return int(base_duration * variation)

    def _generate_historical_delay(
        self, weather: str, traffic: str
    ) -> int:
        """Generate historical delay based on weather and traffic"""
        base_delay = 0

        weather_delay = {
            "Clear": 5,
            "Partly Cloudy": 8,
            "Cloudy": 10,
            "Light Rain": 20,
            "Rain": 35,
            "Heavy Rain": 60,
            "Thunderstorm": 90,
            "Fog": 45,
        }
        base_delay += weather_delay.get(weather, 10)

        traffic_delay = {"low": 5, "moderate": 15, "high": 30, "very_high": 50}
        base_delay += traffic_delay.get(traffic, 10)

        variation = np.random.uniform(0.7, 1.3)
        return int(base_delay * variation)

    def _determine_current_risk(
        self, weather: str, traffic: str, hour: int
    ) -> str:
        """Determine current risk level based on conditions"""
        risk_score = 0

        if weather in ["Heavy Rain", "Thunderstorm"]:
            risk_score += 40
        elif weather in ["Rain", "Fog"]:
            risk_score += 25
        elif weather in ["Light Rain", "Cloudy"]:
            risk_score += 10

        if traffic in ["very_high", "high"]:
            risk_score += 20
        elif traffic == "moderate":
            risk_score += 10

        if 22 <= hour or hour <= 5:
            risk_score += 15
        elif 18 <= hour <= 21:
            risk_score += 10

        if risk_score >= 60:
            return "critical"
        elif risk_score >= 35:
            return "high"
        elif risk_score >= 15:
            return "medium"
        else:
            return "low"

    def _generate_destination_delay_rate(self) -> float:
        """Generate destination hub delay rate (0.0 to 1.0)"""
        return round(np.random.beta(2, 5), 4)

    def _generate_risk_label(self, row: pd.Series) -> str:
        """
        Generate risk_level target label based on multiple factors
        
        Logic:
        - Heavy weather + high traffic + critical priority = critical
        - Bad weather + moderate/high traffic = high
        - Moderate conditions = medium
        - Good conditions = low
        """
        risk_score = 0

        if row["weather_condition"] in ["Heavy Rain", "Thunderstorm"]:
            risk_score += 35
        elif row["weather_condition"] in ["Rain", "Fog"]:
            risk_score += 22
        elif row["weather_condition"] in ["Light Rain", "Cloudy"]:
            risk_score += 10

        if row["traffic_level"] == "very_high":
            risk_score += 25
        elif row["traffic_level"] == "high":
            risk_score += 18
        elif row["traffic_level"] == "moderate":
            risk_score += 10

        if row["shipment_priority"] == "critical":
            risk_score += 15
        elif row["shipment_priority"] == "express":
            risk_score += 8

        if row["historical_delay_minutes"] > 60:
            risk_score += 15
        elif row["historical_delay_minutes"] > 30:
            risk_score += 10

        if row["destination_delay_rate"] > 0.5:
            risk_score += 10
        elif row["destination_delay_rate"] > 0.3:
            risk_score += 5

        if row["rerouted_before"] == 1:
            risk_score += 8

        if 22 <= row["departure_hour"] or row["departure_hour"] <= 5:
            risk_score += 12
        elif 18 <= row["departure_hour"] <= 21:
            risk_score += 6

        if risk_score >= 70:
            return "critical"
        elif risk_score >= 45:
            return "high"
        elif risk_score >= 25:
            return "medium"
        else:
            return "low"

    def validate_dataset(self, df: pd.DataFrame) -> dict:
        """
        Validate generated dataset
        
        Returns:
            Dictionary with validation results
        """
        print("\nValidating dataset...")

        results = {
            "total_records": len(df),
            "missing_values": df.isnull().sum().sum(),
            "duplicate_shipment_ids": df["shipment_id"].duplicated().sum(),
            "valid_distances": (
                (df["distance_km"] >= 50) & (df["distance_km"] <= 1000)
            ).sum(),
            "valid_durations": (df["duration_minutes"] > 0).sum(),
            "valid_weights": (
                (df["weight_kg"] >= 1.0) & (df["weight_kg"] <= 500.0)
            ).sum(),
            "risk_level_distribution": df["risk_level"].value_counts().to_dict(),
            "weather_distribution": df["weather_condition"].value_counts().to_dict(),
            "priority_distribution": df["shipment_priority"].value_counts().to_dict(),
        }

        print(f"  [OK] Total records: {results['total_records']}")
        print(f"  [OK] Missing values: {results['missing_values']}")
        print(f"  [OK] Duplicate IDs: {results['duplicate_shipment_ids']}")
        print(
            f"  [OK] Valid distances: {results['valid_distances']}/{results['total_records']}"
        )
        print(
            f"  [OK] Valid durations: {results['valid_durations']}/{results['total_records']}"
        )
        print(
            f"  [OK] Valid weights: {results['valid_weights']}/{results['total_records']}"
        )
        print(f"\n  Risk Level Distribution:")
        for level, count in results["risk_level_distribution"].items():
            print(f"    - {level}: {count} ({count/results['total_records']*100:.1f}%)")

        return results

    def save_dataset(
        self, df: pd.DataFrame, output_path: str = "training_data.csv"
    ) -> None:
        """Save dataset to CSV file"""
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"\nDataset saved to: {output_path}")


def main():
    """Main function to generate and save synthetic dataset"""
    generator = SyntheticDataGenerator(seed=42)

    df = generator.generate_dataset(num_samples=10000)

    validation_results = generator.validate_dataset(df)

    output_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "training_data.csv"
    )
    generator.save_dataset(df, output_path)

    print("\n[SUCCESS] Synthetic dataset generation complete!")
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")


if __name__ == "__main__":
    main()
