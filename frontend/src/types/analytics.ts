/**
 * TURBOGUARD AI — Model Analytics TypeScript Definitions
 * Strictly maps to backend Pydantic schemas in backend/app/schemas/analytics.py
 */

export interface DatasetProtocolInfo {
  dataset_name: string;
  training_engines: number;
  validation_engines: number;
  validation_sequences: number;
  blind_test_engines: number;
  blind_test_sequences: number;
  window_size: number;
  feature_count: number;
  max_rul_cap: number;
  evaluation_protocol: string;
  disclaimer: string;
}

export interface PreprocessingConfig {
  window_size: number;
  stride: number;
  feature_names: string[];
  scaler_type: string;
  scaler_fit_partition: string;
  dropped_zero_variance_features: string[];
  retained_near_constant_features: string[];
}

export interface BenchmarkModelEntry {
  model_name: string;
  architecture_type: string;
  input_representation: string;
  parameter_count: number | null;
  train_rmse: number;
  val_rmse: number;
  train_nasa: number;
  val_nasa: number;
  val_nasa_per_sample: number;
  is_selected: boolean;
  selection_notes?: string | null;
}

export interface ModelComparisonSection {
  benchmark_models: BenchmarkModelEntry[];
  selected_model_name: string;
  primary_selection_criterion: string;
  secondary_selection_criterion: string;
  selection_rationale: string;
}

export interface LayerSpec {
  layer_index: number;
  layer_name: string;
  layer_type: string;
  output_shape: string;
  param_count: number;
  details: string;
}

export interface ArchitectureDetails {
  model_name: string;
  total_parameters: number;
  trainable_parameters: number;
  non_trainable_parameters: number;
  input_shape: string;
  layers: LayerSpec[];
  summary_notes?: string | null;
}

export interface RandomForestHyperparameters {
  n_estimators: number;
  max_features: string;
  min_samples_leaf: number;
  random_state: number;
  n_jobs: number;
  max_depth: number | null;
  parameter_specification_notes: string;
}

export interface EpochRecord {
  epoch: number;
  train_loss: number;
  train_rmse: number;
  val_loss: number;
  val_rmse: number;
}

export interface TrainingHistory {
  total_epochs: number;
  best_epoch: number;
  best_val_loss: number;
  best_val_rmse: number;
  early_stopping_triggered: boolean;
  early_stopping_epoch: number;
  early_stopping_patience: number;
  monitor_metric: string;
  weights_restored_from_epoch: number;
  epochs: EpochRecord[];
}

export interface ArtifactItem {
  name: string;
  filename: string;
  file_path: string;
  exists_on_disk: boolean;
  size_bytes: number;
  expected_size_bytes: number;
  description: string;
}

export interface ArtifactProvenance {
  artifacts: ArtifactItem[];
  verification_status: string;
}

export interface NasaScoringInfo {
  formula: string;
  under_prediction_penalty: string;
  over_prediction_penalty: string;
  asymmetry_interpretation: string;
}

export interface PartitionMetrics {
  partition_name: string;
  sample_count: number;
  sample_unit: string;
  rmse: number;
  nasa_total_score: number;
  nasa_score_per_sample: number;
  protocol_description: string;
}

export interface EvaluationSummary {
  validation_metrics: PartitionMetrics;
  blind_test_metrics: PartitionMetrics;
  generalization_notes: string;
}

export interface AnalyticsOverviewResponse {
  dataset_protocol: DatasetProtocolInfo;
  preprocessing: PreprocessingConfig;
  model_comparison: ModelComparisonSection;
  lstm_architecture: ArchitectureDetails;
  cnn_architecture: ArchitectureDetails;
  random_forest_hyperparameters: RandomForestHyperparameters;
  training_history: TrainingHistory;
  artifact_provenance: ArtifactProvenance;
  nasa_scoring: NasaScoringInfo;
  evaluation_summary: EvaluationSummary;
}

export interface TestParityRecord {
  engine_id: number;
  actual_rul: number;
  predicted_rul: number;
  residual: number;
}

export interface TestParitySummary {
  engine_count: number;
  test_rmse: number;
  test_nasa_total: number;
  test_nasa_per_engine: number;
}

export interface TestParityResponse {
  evaluation_partition: string;
  dataset: string;
  engine_count: number;
  window_size: number;
  feature_count: number;
  model_name: string;
  evaluation_protocol: string;
  disclaimer: string;
  summary: TestParitySummary;
  records: TestParityRecord[];
}
