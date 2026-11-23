import React from 'react';
import { Target, Award, CheckCircle, Cpu, Layers } from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { AnalyticsOverviewResponse, TestParityResponse } from '../../types/analytics';

export interface AnalyticsSummaryCardsProps {
  overview: AnalyticsOverviewResponse;
  testParity: TestParityResponse;
  className?: string;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  overview,
  testParity,
  className = '',
}) => {
  const { summary } = testParity;
  const { training_history, lstm_architecture } = overview;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 ${className}`}>
      {/* 1. Test RMSE */}
      <MetricCard
        label="Held-Out Test RMSE"
        value={`${summary.test_rmse.toFixed(4)}`}
        subtext="Cycles (N=100 Blind Test Engines)"
        icon={<Target className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Val RMSE:</span>
            <span className="font-mono text-cyan-400">
              {overview.evaluation_summary.validation_metrics.rmse.toFixed(4)} cycles
            </span>
          </div>
        }
      />

      {/* 2. NASA Asymmetric Score */}
      <MetricCard
        label="Test NASA Score"
        value={`${summary.test_nasa_total.toFixed(2)}`}
        subtext={`${summary.test_nasa_per_engine.toFixed(4)} / engine (N=100)`}
        icon={<Award className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Val NASA / sample:</span>
            <span className="font-mono text-cyan-400">
              {overview.evaluation_summary.validation_metrics.nasa_score_per_sample.toFixed(4)}
            </span>
          </div>
        }
      />

      {/* 3. Optimal Training Checkpoint */}
      <MetricCard
        label="Optimal Checkpoint"
        value={`Epoch ${training_history.best_epoch}`}
        subtext={`Stopped at Epoch ${training_history.early_stopping_epoch}`}
        icon={<CheckCircle className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px]">
            <Badge variant="emerald" dot>Weights Restored</Badge>
            <span className="font-mono text-slate-400 text-[10px]">Patience: 7</span>
          </div>
        }
      />

      {/* 4. Model Architecture & Complexity */}
      <MetricCard
        label="Model Parameters"
        value={`${lstm_architecture.total_parameters.toLocaleString()}`}
        subtext="100% Trainable (Zero Non-Trainable)"
        icon={<Cpu className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Model:</span>
            <span className="font-mono text-cyan-400 truncate max-w-[120px]">
              Stacked LSTM
            </span>
          </div>
        }
      />

      {/* 5. Input Dimension */}
      <MetricCard
        label="Input Sequence"
        value="30 × 17"
        subtext="Cycles × Active Sensor Channels"
        icon={<Layers className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Scaler:</span>
            <Badge variant="cyan">StandardScaler</Badge>
          </div>
        }
      />
    </div>
  );
};
