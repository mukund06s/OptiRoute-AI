/**
 * ML Client Service
 * HTTP client to communicate with Python ML prediction service
 */

import axios, { AxiosInstance } from 'axios';

export interface MLPredictionRequest {
  origin_hub: string;
  destination_hub: string;
  distance_km: number;
  duration_minutes: number;
  road_type: string;
  weather_condition: string;
  traffic_level: string;
  shipment_priority: string;
  weight_kg: number;
  departure_hour: number;
  day_of_week: string;
  historical_delay_minutes: number;
  current_risk_level: string;
  rerouted_before: boolean;
  destination_delay_rate: number;
}

export interface FeatureContribution {
  feature: string;
  contribution: number;
}

export interface MLPredictionResponse {
  predicted_class: string;
  confidence: number;
  probabilities: Record<string, number>;
  top_features: FeatureContribution[];
  positive_contributors: FeatureContribution[];
  negative_contributors: FeatureContribution[];
  human_explanation: string;
  prediction_latency_ms: number;
}

export class MLClientService {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.timeout = 10000;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async predict(request: MLPredictionRequest): Promise<MLPredictionResponse> {
    try {
      const response = await this.client.post<MLPredictionResponse>(
        '/predict',
        request
      );

      if (response.status === 200 && response.data) {
        return response.data;
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      if (error.response?.status === 503) {
        throw new Error('ML service not ready. Model not loaded.');
      }

      if (error.response?.status === 400) {
        throw new Error(`Invalid prediction request: ${error.response.data.detail}`);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('ML service unavailable. Connection refused.');
      }

      throw new Error(`Prediction failed: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.status === 200 && response.data.model_loaded === true;
    } catch (error) {
      return false;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const mlClientService = new MLClientService();
