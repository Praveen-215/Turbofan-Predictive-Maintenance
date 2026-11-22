import React, { memo } from 'react';
import {
  Cpu,
  Zap,
  RotateCcw,
  AlertTriangle,
  Info,
  Layers,
  Database,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { EngineReplayResponse } from '../../types/fleet';
import { ApiError } from '../../types/api';

export interface LivePredictionCardProps {
  /** Target engine unit ID under evaluation */
  engineId: number;
  /** Active 30-cycle observation window metadata used as model input */
  observationWindow: {
    startCycle: number;
    endCycle: number;
    isValid: boolean;
    length?: number;
  };
  /** Estimated Remaining Useful Life in dataset cycles (raw numeric from backend) */
  predictedRul: number | null;
  /** Full prediction replay response from backend API */
  predictionResult?: EngineReplayResponse | null;
  /** Inference execution loading state */
  isPredicting?: boolean;
  /** Prediction error response if inference failed */
  predictionError?: ApiError | null;
  /** Explicit user-triggered callback to evaluate Stacked LSTM on current 30-cycle window */
  onEvaluatePrediction?: () => void | Promise<void>;
  /** Optional callback to clear the current prediction */
  onClearPrediction?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Optional container class name */
  className?: string;
}

export const LivePredictionCard: React.FC<LivePredictionCardProps> = memo(({
  engineId,
  observationWindow,
  predictedRul,
  predictionResult,
  isPredicting = false,
  predictionError = null,
  onEvaluatePrediction,
  onClearPrediction,
  disabled = false,
  className = '',
}) => {
  const canEvaluate = observationWindow.isValid && !isPredicting && !disabled && Boolean(onEvaluatePrediction);

  return (
    <Card className={`p-5 flex flex-col gap-4 ${className}`}>
      {/* Header and Model Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <span>AI RUL Estimation</span>
              <span className="text-[10px] text-slate-400 font-normal">(Stacked LSTM)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              NASA C-MAPSS FD001 Deep Learning Model Inference
            </p>
          </div>
        </div>

        {/* State Badges */}
        <div>
          {isPredicting ? (
            <Badge variant="cyan" dot>
              Running Inference...
            </Badge>
          ) : predictedRul !== null ? (
            <Badge variant="emerald" dot>
              Model Output Available
            </Badge>
          ) : predictionError ? (
            <Badge variant="rose" dot>
              Evaluation Failed
            </Badge>
          ) : (
            <Badge variant="slate" dot>
              Evaluation Ready
            </Badge>
          )}
        </div>
      </div>

      {/* Model Input Horizon Specification */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Target Unit
          </span>
          <span className="text-white font-bold text-sm">
            Unit #{engineId.toString().padStart(3, '0')}
          </span>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Input Window
          </span>
          <span className="text-cyan-400 font-bold text-sm">
            Cycles {observationWindow.startCycle} – {observationWindow.endCycle}
          </span>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
            Input Tensor Shape
          </span>
          <span className="text-slate-200 font-bold text-sm">
            [1, 30, 17]
          </span>
        </div>
      </div>

      {/* Primary Display Area */}
      {isPredicting ? (
        <div className="py-6 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner
            label="Evaluating Stacked LSTM model on 30-cycle observation sequence..."
            size="md"
          />
          <p className="text-[11px] font-mono text-slate-400 text-center max-w-md">
            Processing 30 consecutive observations across all 17 canonical features via backend inference endpoint.
          </p>
        </div>
      ) : predictionError ? (
        <div className="space-y-3">
          <ErrorAlert
            title="Stacked LSTM Evaluation Error"
            message={predictionError.message}
            isOffline={predictionError.isOffline}
            onRetry={canEvaluate ? onEvaluatePrediction : undefined}
          />
        </div>
      ) : predictedRul !== null ? (
        <div className="space-y-4">
          {/* Hero RUL Metric Box */}
          <div className="p-4 rounded-lg bg-navy-950 border border-cyan-500/40 shadow-lg shadow-cyan-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Estimated Remaining Useful Life (RUL)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight">
                  {predictedRul.toFixed(1)}
                </span>
                <span className="text-cyan-400 font-mono font-semibold text-sm uppercase">
                  Dataset Cycles
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Exact backend output: {predictedRul.toFixed(4)} cycles
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2">
              {onEvaluatePrediction && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onEvaluatePrediction}
                  disabled={!canEvaluate}
                  icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />}
                  className="w-full text-xs font-mono"
                >
                  Re-evaluate
                </Button>
              )}

              {onClearPrediction && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearPrediction}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="w-full text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Clear Result
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Awaiting User Trigger (Idle State) */
        <div className="py-2 space-y-4">
          <div className="p-4 rounded-lg bg-navy-950/60 border border-dashed border-border-subtle text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-border-subtle flex items-center justify-center mx-auto text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                Model Evaluation Decoupled From Exploration
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inference is explicitly triggered on demand. Changing engines, features, chart ranges, or replaying cycles does not trigger background inference.
              </p>
            </div>

            {observationWindow.isValid ? (
              <div className="pt-2">
                <Button
                  size="md"
                  variant="primary"
                  onClick={onEvaluatePrediction}
                  disabled={!canEvaluate}
                  icon={<Zap className="w-4 h-4 fill-current" />}
                  className="font-mono text-xs font-bold px-5"
                >
                  Evaluate Stacked LSTM on Window
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-amber-400 font-mono text-xs pt-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Observation window contains fewer than 30 cycles (minimum required: 30 cycles).
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Specification & Trace Details */}
      <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Model Architecture:</span>
          <span className="text-slate-200 font-medium">
            Stacked LSTM (64 units / 32 units / 16 dense / 1 output)
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Trainable Parameters:</span>
          <span className="text-slate-200 font-medium">33,953 parameters</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Model Artifact:</span>
          <span className="text-slate-200 font-medium">models/stacked_lstm_fd001.keras</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Evaluated Observation Window:</span>
          <span className="text-cyan-400 font-medium">
            Cycles {predictionResult?.start_cycle ?? observationWindow.startCycle} – {predictionResult?.end_cycle ?? observationWindow.endCycle} (30 cycles)
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Ground Truth Policy:</span>
          <span className="text-amber-400/90 font-medium">Held-out benchmark data (unexposed)</span>
        </div>
      </div>

      {/* Research Disclaimer & Operational Notice */}
      <div className="p-3 rounded bg-slate-950/80 border border-slate-900 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Scientific Research Notice</span>
        </div>
        <p className="leading-relaxed">
          {predictionResult?.disclaimer ||
            'This estimation is generated by a research deep-learning model trained on NASA C-MAPSS FD001 simulated run-to-failure degradation trajectories. Dataset cycles are dimensionless simulation steps and do not represent calendar failure dates or operational aircraft airworthiness certification.'}
        </p>
      </div>
    </Card>
  );
});

LivePredictionCard.displayName = 'LivePredictionCard';
