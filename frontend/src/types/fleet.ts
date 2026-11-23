export interface FleetOverviewResponse {
  total_engines: number;
  engine_ids: number[];
  total_telemetry_records: number;
  per_engine_cycles: Record<string, number>;
  features: string[];
  prediction_ready_count: number;
}

export interface EngineSummaryResponse {
  engine_id: number;
  total_cycles: number;
  first_cycle: number;
  last_cycle: number;
  latest_sensor_readings: Record<string, number>;
  has_sufficient_history: boolean;
}

export interface TelemetryRecord {
  cycle: number;
  sensors: Record<string, number>;
}

export interface EngineTelemetryResponse {
  engine_id: number;
  start_cycle: number;
  end_cycle: number;
  record_count: number;
  telemetry: TelemetryRecord[];
}

export interface EngineReplayResponse {
  engine_id: number;
  start_cycle: number;
  end_cycle: number;
  window_length: number;
  feature_names: string[];
  sequence: number[][];
  predicted_rul?: number | null;
  disclaimer: string;
}

export interface EngineInventoryItem {
  engineId: number;
  totalCycles: number;
  isPredictionReady: boolean;
  status: 'Active' | 'Insufficient History';
}
