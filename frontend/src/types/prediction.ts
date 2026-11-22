export interface PredictionResponse {
  predicted_rul: number;
  unit: string;
  model_name: string;
  sequence_length: number;
  feature_count: number;
  status: string;
  disclaimer: string;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  scaler_loaded: boolean;
  features_loaded: boolean;
  model_name: string;
  input_shape: number[];
  features_count: number;
  features_list: string[];
  metadata: {
    model_name?: string;
    rmse_cycles?: number;
    test_nasa_score?: number;
    selected_features_count?: number;
    training_dataset?: string;
    test_dataset?: string;
    window_length?: number;
    [key: string]: unknown;
  };
}

export interface TelemetrySequenceRequest {
  feature_names: string[];
  sequence: number[][];
}
