import React, { memo } from 'react';
import { Database, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { Badge } from '../common/Badge';
import { FleetPredictionSummary, FleetPredictionProgress } from '../../types/prediction';

export interface PredictionSummaryCardsProps {
  /** Aggregated prediction summary metrics */
  summary: FleetPredictionSummary;
  /** Real-time fleet evaluation execution progress */
  progress?: FleetPredictionProgress;
  /** Optional container class name */
  className?: string;
}

/**
 * PredictionSummaryCards
 * Displays high-level fleet-wide Remaining Useful Life (RUL) inference metrics:
 * total test engines, successfully evaluated engines, pending evaluations, failed attempts,
 * and arithmetic mean predicted RUL.
 */
export const PredictionSummaryCards: React.FC<PredictionSummaryCardsProps> = memo(({
  summary,
  progress,
  className = '',
}) => {
  const pendingCount = Math.max(
    0,
    summary.totalEngines - (summary.successfulCount + summary.failedCount)
  );

  const evaluationPercent =
    summary.totalEngines > 0
      ? Math.round((summary.successfulCount / summary.totalEngines) * 100)
      : 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 ${className}`}>
      {/* 1. Total Fleet Benchmark Units */}
      <MetricCard
        label="Total Test Fleet"
        value={summary.totalEngines}
        subtext="NASA C-MAPSS FD001"
        icon={<Database className="w-4 h-4" />}
        badge={
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Test partition</span>
            <span className="font-mono text-cyan-400">100 Turbofans</span>
          </div>
        }
      />

      {/* 2. Successfully Evaluated Engines */}
      <MetricCard
        label="Evaluated"
        value={`${summary.successfulCount} / ${summary.totalEngines}`}
        subtext={`${evaluationPercent}% inference complete`}
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        badge={
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Status</span>
            {summary.successfulCount === summary.totalEngines ? (
              <Badge variant="emerald" dot>
                Complete
              </Badge>
            ) : summary.successfulCount > 0 ? (
              <Badge variant="cyan" dot>
                In Progress
              </Badge>
            ) : (
              <Badge variant="slate" dot>
                Awaiting Run
              </Badge>
            )}
          </div>
        }
      />

      {/* 3. Pending Evaluations */}
      <MetricCard
        label="Pending"
        value={pendingCount}
        subtext={
          progress?.isRunning
            ? `${progress.activeWorkerCount} worker${progress.activeWorkerCount === 1 ? '' : 's'} active`
            : 'Queued for inference'
        }
        icon={<Clock className="w-4 h-4 text-slate-400" />}
        badge={
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Queue State</span>
            {pendingCount === 0 ? (
              <Badge variant="emerald">0 Pending</Badge>
            ) : progress?.isRunning ? (
              <Badge variant="cyan" dot>
                Processing
              </Badge>
            ) : (
              <Badge variant="slate">Idle</Badge>
            )}
          </div>
        }
      />

      {/* 4. Failed Evaluations */}
      <MetricCard
        label="Evaluation Errors"
        value={summary.failedCount}
        subtext={
          summary.failedCount > 0
            ? 'Individual retries available'
            : '0 error captures'
        }
        icon={<AlertCircle className={`w-4 h-4 ${summary.failedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />}
        badge={
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Integrity</span>
            {summary.failedCount > 0 ? (
              <Badge variant="rose" dot>
                {summary.failedCount} Failed
              </Badge>
            ) : (
              <Badge variant="slate">Nominal</Badge>
            )}
          </div>
        }
      />

      {/* 5. Mean Predicted RUL */}
      <MetricCard
        label="Mean Predicted RUL"
        value={
          summary.successfulCount > 0 && summary.meanRul !== null
            ? `${summary.meanRul.toFixed(1)}`
            : '—'
        }
        subtext={
          summary.successfulCount > 0 && summary.meanRul !== null
            ? `Exact: ${summary.meanRul.toFixed(3)} cycles`
            : 'No successful predictions yet'
        }
        icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
        badge={
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Range</span>
            {summary.minRul !== null && summary.maxRul !== null ? (
              <span className="font-mono text-cyan-400">
                {summary.minRul.toFixed(0)} – {summary.maxRul.toFixed(0)} cyc
              </span>
            ) : (
              <span className="font-mono text-slate-500">—</span>
            )}
          </div>
        }
      />
    </div>
  );
});

PredictionSummaryCards.displayName = 'PredictionSummaryCards';
