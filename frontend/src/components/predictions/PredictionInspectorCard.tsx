import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Layers,
  Clock,
  ExternalLink,
  Zap,
  Info,
  X,
  Database,
  Binary,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { EmptyState } from '../common/EmptyState';
import { FleetPredictionItem } from '../../types/prediction';

export interface PredictionInspectorCardProps {
  /** The currently selected turbofan engine prediction record, or null */
  selectedEngine: FleetPredictionItem | null;
  /** Callback to evaluate or retry inference on this single engine */
  onEvaluateEngine?: (engineId: number) => Promise<void> | void;
  /** Callback to close or dismiss the inspector panel */
  onClose?: () => void;
  /** Whether fleet or individual inference is in progress */
  isEvaluating?: boolean;
  /** Optional container class name */
  className?: string;
}

/**
 * PredictionInspectorCard
 * Focused inspector panel providing granular telemetry horizon details,
 * deep-learning model specifications, exact floating-point outputs, and operational notices
 * for a specifically selected turbofan engine unit.
 */
export const PredictionInspectorCard: React.FC<PredictionInspectorCardProps> = memo(({
  selectedEngine,
  onEvaluateEngine,
  onClose,
  isEvaluating = false,
  className = '',
}) => {
  const navigate = useNavigate();

  if (!selectedEngine) {
    return (
      <Card className={`p-6 flex items-center justify-center min-h-[320px] ${className}`}>
        <EmptyState
          title="No Engine Selected"
          description="Select an engine row from the Test Fleet Predictions inventory to inspect detailed observation sequences, model inputs, and exact inference metrics."
          icon={<Cpu className="w-10 h-10 stroke-[1.5] text-slate-600" />}
        />
      </Card>
    );
  }

  const isRunning = selectedEngine.status === 'evaluating' || isEvaluating;
  const isSuccess = selectedEngine.status === 'success' && selectedEngine.predictedRul !== null;
  const isError = selectedEngine.status === 'error';

  const formattedTimestamp = selectedEngine.evaluatedAt
    ? `${new Date(selectedEngine.evaluatedAt).toLocaleString()} (Client Local)`
    : null;

  return (
    <Card className={`p-5 flex flex-col gap-4 border-cyan-800/40 ${className}`}>
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <span>Unit #{selectedEngine.engineId.toString().padStart(3, '0')}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">Prediction Inspector</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              NASA C-MAPSS FD001 Test Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isRunning ? (
            <Badge variant="cyan" dot>
              Evaluating...
            </Badge>
          ) : isSuccess ? (
            <Badge variant="emerald" dot>
              Evaluated
            </Badge>
          ) : isError ? (
            <Badge variant="rose" dot>
              Failed
            </Badge>
          ) : (
            <Badge variant="slate" dot>
              Pending
            </Badge>
          )}

          {onClose && (
            <button
              onClick={onClose}
              title="Close Inspector"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Unit & Observation Window Specifications */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Total Test Cycles
          </span>
          <span className="text-white font-bold text-sm">
            {selectedEngine.totalCycles > 0 ? `${selectedEngine.totalCycles} Cycles` : '—'}
          </span>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Observation Window
          </span>
          <span className="text-cyan-400 font-bold text-sm">
            {selectedEngine.windowStartCycle > 0 && selectedEngine.windowEndCycle > 0
              ? `Cycles ${selectedEngine.windowStartCycle} – ${selectedEngine.windowEndCycle}`
              : 'Terminal 30 Cycles'}
          </span>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Binary className="w-3 h-3 text-cyan-400" /> Input Tensor Shape
          </span>
          <span className="text-slate-200 font-bold text-sm">
            [1, 30, 17]
          </span>
        </div>
      </div>

      {/* State-Specific Content Body */}
      {isRunning ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3 bg-navy-950/40 rounded-lg border border-border-subtle">
          <LoadingSpinner
            label={`Evaluating Stacked LSTM on Unit #${selectedEngine.engineId}...`}
            size="md"
          />
          <p className="text-[11px] font-mono text-slate-400 text-center max-w-sm">
            Fetching 30-cycle terminal sequence and executing model forward pass.
          </p>
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <ErrorAlert
            title={`Evaluation Error: Unit #${selectedEngine.engineId}`}
            message={selectedEngine.error || 'The model inference request failed.'}
            onRetry={onEvaluateEngine ? () => onEvaluateEngine(selectedEngine.engineId) : undefined}
          />
        </div>
      ) : isSuccess ? (
        <div className="space-y-4">
          {/* Hero Prediction Display Box */}
          <div className="p-4 rounded-lg bg-navy-950 border border-cyan-500/40 shadow-lg shadow-cyan-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">
                Estimated Remaining Useful Life (RUL)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight">
                  {selectedEngine.predictedRul?.toFixed(1)}
                </span>
                <span className="text-cyan-400 font-mono font-semibold text-sm uppercase">
                  Dataset Cycles
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Exact unclipped model output: {selectedEngine.predictedRul?.toFixed(4)} cycles
              </p>
            </div>

            {/* Actions: Re-evaluate & Monitoring Link */}
            <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2">
              {onEvaluateEngine && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEvaluateEngine(selectedEngine.engineId)}
                  disabled={isRunning}
                  icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />}
                  className="text-xs font-mono"
                >
                  Re-evaluate Unit
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/engines?id=${selectedEngine.engineId}`)}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
              >
                Inspect Telemetry
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Pending State: Awaiting Inference */
        <div className="py-4 space-y-3 bg-navy-950/40 rounded-lg border border-dashed border-border-subtle p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-border-subtle flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Inference Not Yet Executed
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Unit #{selectedEngine.engineId} has not been evaluated. Run fleet evaluation or trigger a single-unit evaluation below.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            {onEvaluateEngine && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onEvaluateEngine(selectedEngine.engineId)}
                disabled={isRunning}
                icon={<Zap className="w-3.5 h-3.5 fill-current" />}
                className="font-mono text-xs font-bold"
              >
                Evaluate Unit #{selectedEngine.engineId}
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/engines?id=${selectedEngine.engineId}`)}
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              className="font-mono text-xs"
            >
              View Telemetry
            </Button>
          </div>
        </div>
      )}

      {/* Model Architecture & Provenance Specs */}
      <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs font-mono space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Model Architecture:</span>
          <span className="text-slate-200 font-medium">
            Stacked LSTM (64 units / 32 units / 16 dense / 1 output)
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Sequence Length × Feature Count:</span>
          <span className="text-slate-200 font-medium">
            30 chronological cycles × 17 sensor features
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-border-subtle">
          <span>Model Artifact:</span>
          <span className="text-slate-200 font-medium truncate max-w-[220px]">
            models/stacked_lstm_fd001.keras
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Evaluation Timestamp:</span>
          <span className="text-cyan-400 font-medium">
            {formattedTimestamp || 'Not yet recorded'}
          </span>
        </div>
      </div>

      {/* Research Disclaimer */}
      <div className="p-3 rounded bg-slate-950/80 border border-slate-900 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Inference Scope Notice</span>
        </div>
        <p className="leading-relaxed">
          Predicted Remaining Useful Life values are model regression outputs computed over test_FD001.txt run-to-failure cycles.
          These estimates are dimensionless research figures and are not intended for flight-critical airworthiness dispatch.
        </p>
      </div>
    </Card>
  );
});

PredictionInspectorCard.displayName = 'PredictionInspectorCard';
