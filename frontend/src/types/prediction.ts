/**
 * TURBOGUARD AI — AI Prediction Domain Models
 * Strongly typed schemas for model inference, health check, sequence inputs,
 * and fleet-wide Remaining Useful Life (RUL) estimation.
 */

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

/**
 * Lifecycle status of an individual engine RUL prediction.
 */
export type FleetPredictionStatus = 'pending' | 'evaluating' | 'success' | 'error';

/**
 * Record representing an evaluated or queued turbofan engine prediction.
 * Preserves exact numeric precision and terminal observation window without clipping.
 */
export interface FleetPredictionItem {
  /** Engine unit identifier (1–100 in NASA C-MAPSS FD001) */
  engineId: number;
  /** Total operational flight cycles recorded in benchmark test telemetry */
  totalCycles: number;
  /** Start cycle of the 30-cycle observation window */
  windowStartCycle: number;
  /** End cycle of the 30-cycle observation window (terminal recorded cycle) */
  windowEndCycle: number;
  /**
   * Raw predicted Remaining Useful Life (RUL) in dataset cycles.
   * Floating-point precision is preserved directly from backend model output without clipping.
   */
  predictedRul: number | null;
  /** Lifecycle evaluation status */
  status: FleetPredictionStatus;
  /**
   * Client-side ISO timestamp recorded when the evaluation API response arrived.
   * Explicitly labeled as client local time.
   */
  evaluatedAt: string | null;
  /** Detailed error message if evaluation failed for this engine */
  error: string | null;
}

/**
 * Descriptive predicted-RUL histogram bin for population distribution visualization.
 * Uses objective cycle ranges without prescriptive maintenance tiers.
 */
export interface RulHistogramBin {
  /** Descriptive range label (e.g., "< 0", "0–25", "26–50", "> 125") */
  range: string;
  /** Lower bound of the bin (inclusive) */
  min: number;
  /** Upper bound of the bin (inclusive) */
  max: number;
  /** Number of evaluated engines falling into this cycle range */
  count: number;
  /** Percentage of successfully evaluated engines falling into this bin */
  percentage: number;
  /** List of engine IDs present in this bin */
  engineIds: number[];
}

/**
 * Real-time execution progress of the client-side fleet inference queue.
 */
export interface FleetPredictionProgress {
  /** Total engines queued for evaluation (default: 100) */
  total: number;
  /** Completed attempts count (sum of both successful evaluations and captured errors) */
  completed: number;
  /** Successfully evaluated predictions count */
  successful: number;
  /** Failed evaluations count */
  failed: number;
  /** Completion percentage of attempts (0–100) */
  percent: number;
  /** Whether the worker pool is actively executing requests */
  isRunning: boolean;
  /** Number of concurrent workers actively executing HTTP requests */
  activeWorkerCount: number;
  /** Elapsed evaluation time in seconds (measured client-side) */
  elapsedSeconds: number;
}

/**
 * Aggregated summary statistics across all evaluated test engines.
 */
export interface FleetPredictionSummary {
  /** Total benchmark engines in test fleet (100) */
  totalEngines: number;
  /** Number of engines with completed evaluation attempts */
  evaluatedCount: number;
  /** Number of engines with successful predictions */
  successfulCount: number;
  /** Number of engines with failed evaluations */
  failedCount: number;
  /** Arithmetic mean of predicted RULs across successful evaluations (exact precision) */
  meanRul: number | null;
  /** Minimum predicted RUL among successful evaluations */
  minRul: number | null;
  /** Engine ID exhibiting the minimum predicted RUL */
  minRulEngineId: number | null;
  /** Maximum predicted RUL among successful evaluations */
  maxRul: number | null;
  /** Engine ID exhibiting the maximum predicted RUL */
  maxRulEngineId: number | null;
}
