import React, { memo } from 'react';
import { Cpu, Layers, Database, Info, GitBranch, Binary } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export interface PredictionProvenanceBannerProps {
  /** Optional container class name */
  className?: string;
}

/**
 * PredictionProvenanceBanner
 * Displays the verified deep-learning architecture and scientific provenance
 * for the NASA C-MAPSS FD001 Stacked LSTM model inference engine.
 */
export const PredictionProvenanceBanner: React.FC<PredictionProvenanceBannerProps> = memo(({
  className = '',
}) => {
  return (
    <Card className={`p-4 sm:p-5 flex flex-col gap-4 border-cyan-800/40 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 ${className}`}>
      {/* Header and Model Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Model & Inference Provenance
              </h3>
              <Badge variant="cyan" dot>
                Production Artifact
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Validated Deep-Learning Remaining Useful Life (RUL) Inference Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-border-subtle">
            TensorFlow 2 / Keras
          </span>
        </div>
      </div>

      {/* Provenance Specifications Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {/* Model Architecture */}
        <div className="p-3 rounded-md bg-navy-950/80 border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wider mb-1">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture</span>
          </div>
          <p className="text-slate-200 font-semibold text-xs leading-snug">
            Stacked LSTM
          </p>
          <span className="text-[10px] text-slate-400 mt-1">
            LSTM(64) → Drop(0.2) → LSTM(32) → Drop(0.2) → Dense(16) → Dense(1)
          </span>
        </div>

        {/* Trainable Parameters */}
        <div className="p-3 rounded-md bg-navy-950/80 border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wider mb-1">
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parameters</span>
          </div>
          <p className="text-slate-200 font-semibold text-xs">
            33,953 Trainable Weights
          </p>
          <span className="text-[10px] text-slate-400 mt-1">
            Optimized via Adam, early stopping (patience=10)
          </span>
        </div>

        {/* Input Horizon */}
        <div className="p-3 rounded-md bg-navy-950/80 border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Input Tensor Shape</span>
          </div>
          <p className="text-cyan-400 font-semibold text-xs">
            [1, 30, 17]
          </p>
          <span className="text-[10px] text-slate-400 mt-1">
            30 chronological cycles × 17 selected sensor features
          </span>
        </div>

        {/* Model Artifact */}
        <div className="p-3 rounded-md bg-navy-950/80 border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wider mb-1">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Storage Artifact</span>
          </div>
          <p className="text-slate-200 font-semibold text-xs truncate" title="models/stacked_lstm_fd001.keras">
            models/stacked_lstm_fd001.keras
          </p>
          <span className="text-[10px] text-slate-400 mt-1">
            Held-out benchmark FD001 test split
          </span>
        </div>
      </div>

      {/* Scientific Research Disclaimer */}
      <div className="p-3 rounded-md bg-slate-950/80 border border-slate-900 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Scientific Research & Operational Notice</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Predictions are continuous mathematical estimates computed in dataset cycles from the NASA C-MAPSS FD001
          run-to-failure benchmark. Dataset cycles are dimensionless simulation time steps and do not represent confirmed
          calendar failure dates, operational flight dispatch clearances, or certified aircraft airworthiness limits.
        </p>
      </div>
    </Card>
  );
});

PredictionProvenanceBanner.displayName = 'PredictionProvenanceBanner';
