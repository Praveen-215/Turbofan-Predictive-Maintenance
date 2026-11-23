import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  Info,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { CycleRange } from '../../hooks/useEngineTelemetry';

export interface CycleRangeControlsProps {
  /** Currently selected cycle range for chart filtering */
  cycleRange: CycleRange;
  /** Minimum available dataset cycle for current engine */
  minCycle: number;
  /** Maximum available dataset cycle for current engine */
  maxCycle: number;
  /** Callback triggered when user updates the cycle range */
  onRangeChange: (range: CycleRange) => void;
  /** Callback to reset range to full available span */
  onResetRange: () => void;
  /** Model inference 30-cycle observation window metadata */
  observationWindow?: {
    startCycle: number;
    endCycle: number;
    isValid: boolean;
    length?: number;
  };
  /** Loading state indicator */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Optional container class names */
  className?: string;
}

export const CycleRangeControls: React.FC<CycleRangeControlsProps> = memo(({
  cycleRange,
  minCycle,
  maxCycle,
  onRangeChange,
  onResetRange,
  observationWindow,
  loading = false,
  disabled = false,
  className = '',
}) => {
  // Validate telemetry boundary readiness
  const isReady = maxCycle > minCycle && !loading && !disabled;
  const totalCycles = maxCycle >= minCycle ? maxCycle - minCycle + 1 : 0;
  const currentSpan = cycleRange.end >= cycleRange.start ? cycleRange.end - cycleRange.start + 1 : 0;
  const isFullRange = cycleRange.start <= minCycle && cycleRange.end >= maxCycle;

  // Local text input states to allow smooth typing without jumping
  const [startInput, setStartInput] = useState<string>(cycleRange.start.toString());
  const [endInput, setEndInput] = useState<string>(cycleRange.end.toString());

  // Synchronize local input fields when external cycleRange changes (e.g. engine switch or reset)
  useEffect(() => {
    setStartInput(cycleRange.start.toString());
  }, [cycleRange.start]);

  useEffect(() => {
    setEndInput(cycleRange.end.toString());
  }, [cycleRange.end]);

  // Handle start cycle change with strict boundary enforcement
  const handleStartCommit = useCallback(
    (rawVal: number) => {
      if (!isReady) return;
      const clamped = Math.max(minCycle, Math.min(rawVal, cycleRange.end));
      setStartInput(clamped.toString());
      if (clamped !== cycleRange.start) {
        onRangeChange({ start: clamped, end: cycleRange.end });
      }
    },
    [isReady, minCycle, cycleRange.end, cycleRange.start, onRangeChange]
  );

  // Handle end cycle change with strict boundary enforcement
  const handleEndCommit = useCallback(
    (rawVal: number) => {
      if (!isReady) return;
      const clamped = Math.max(cycleRange.start, Math.min(rawVal, maxCycle));
      setEndInput(clamped.toString());
      if (clamped !== cycleRange.end) {
        onRangeChange({ start: cycleRange.start, end: clamped });
      }
    },
    [isReady, maxCycle, cycleRange.start, cycleRange.end, onRangeChange]
  );

  // Quick preset handlers
  const handlePresetFull = useCallback(() => {
    if (!isReady) return;
    onResetRange();
  }, [isReady, onResetRange]);

  const handlePresetLast30 = useCallback(() => {
    if (!isReady) return;
    const start = Math.max(minCycle, maxCycle - 29);
    onRangeChange({ start, end: maxCycle });
  }, [isReady, minCycle, maxCycle, onRangeChange]);

  const handlePresetLast50 = useCallback(() => {
    if (!isReady) return;
    const start = Math.max(minCycle, maxCycle - 49);
    onRangeChange({ start, end: maxCycle });
  }, [isReady, minCycle, maxCycle, onRangeChange]);

  const handlePresetFirst30 = useCallback(() => {
    if (!isReady) return;
    const end = Math.min(minCycle + 29, maxCycle);
    onRangeChange({ start: minCycle, end });
  }, [isReady, minCycle, maxCycle, onRangeChange]);

  // Calculate percentage positions for visual timeline bar
  const totalSpan = maxCycle - minCycle || 1;
  const filterLeftPct = Math.max(0, Math.min(100, ((cycleRange.start - minCycle) / totalSpan) * 100));
  const filterWidthPct = Math.max(0, Math.min(100 - filterLeftPct, (currentSpan / totalSpan) * 100));

  const obsLeftPct = observationWindow?.isValid
    ? Math.max(0, Math.min(100, ((observationWindow.startCycle - minCycle) / totalSpan) * 100))
    : 0;
  const obsWidthPct = observationWindow?.isValid
    ? Math.max(0, Math.min(100 - obsLeftPct, (30 / totalSpan) * 100))
    : 0;

  if (!isReady) {
    return (
      <Card className={`p-4 flex items-center justify-between gap-3 text-xs text-slate-400 ${className}`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 animate-pulse" />
          <span>Awaiting engine telemetry range boundaries...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 flex flex-col gap-4 ${className}`}>
      {/* Header and Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
            Dataset Cycle Range Filter
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            (Cycles {minCycle} – {maxCycle} available • {totalCycles} total)
          </span>
        </div>

        {/* Reset Action */}
        <Button
          size="sm"
          variant="secondary"
          onClick={onResetRange}
          disabled={isFullRange || disabled}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          className="text-xs font-mono"
        >
          Reset Full Range
        </Button>
      </div>

      {/* Range Status & Model Window Disambiguation Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2.5 rounded-lg bg-navy-950/80 border border-border-subtle text-xs font-mono">
        {/* Visual Chart Filter Display */}
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
          <span className="text-slate-400">Plotted Chart Range:</span>
          <span className="text-cyan-400 font-bold text-sm">
            Cycles {cycleRange.start} – {cycleRange.end}
          </span>
          <span className="text-slate-500">
            ({currentSpan} of {totalCycles} cycles)
          </span>
        </div>

        {/* Inference Observation Window Display */}
        {observationWindow?.isValid && (
          <div className="flex items-center gap-2 text-slate-300 lg:border-l lg:border-border-subtle lg:pl-3 pt-2 lg:pt-0 border-t border-border-subtle lg:border-t-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-slate-400">Model Input Window:</span>
            <span className="text-emerald-400 font-bold">
              Cycles {observationWindow.startCycle} – {observationWindow.endCycle}
            </span>
            <span className="text-slate-500 text-[11px]">
              (30-cycle inference slice)
            </span>
          </div>
        )}
      </div>

      {/* Visual Timeline Track */}
      <div className="space-y-1.5 px-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Cycle {minCycle}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2 h-1 bg-cyan-500 rounded" /> Chart Filter
            </span>
            {observationWindow?.isValid && (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-1 bg-emerald-400 rounded" /> Model Window
              </span>
            )}
          </div>
          <span>Cycle {maxCycle}</span>
        </div>

        <div className="relative w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          {/* Chart Filter Range Segment (Cyan) */}
          <div
            className="absolute top-0 bottom-0 bg-cyan-600/60 border-l border-r border-cyan-400 transition-all duration-150"
            style={{
              left: `${filterLeftPct}%`,
              width: `${filterWidthPct}%`,
            }}
          />

          {/* Model Window Marker (Emerald line / segment) */}
          {observationWindow?.isValid && (
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/80 border-l border-r border-emerald-300 pointer-events-none transition-all duration-150"
              style={{
                left: `${obsLeftPct}%`,
                width: `${obsWidthPct}%`,
              }}
              title={`Model Inference Window: Cycles ${observationWindow.startCycle} – ${observationWindow.endCycle}`}
            />
          )}
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Start Cycle Control */}
        <div className="p-3 bg-navy-950 rounded-lg border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cycle-start-input"
              className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Start Dataset Cycle</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              [Min: {minCycle}, Max: {cycleRange.end}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrement start cycle by 10"
              onClick={() => handleStartCommit(cycleRange.start - 10)}
              disabled={cycleRange.start <= minCycle || disabled}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-mono rounded border border-border-subtle"
            >
              -10
            </button>
            <button
              type="button"
              aria-label="Decrement start cycle by 1"
              onClick={() => handleStartCommit(cycleRange.start - 1)}
              disabled={cycleRange.start <= minCycle || disabled}
              className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded border border-border-subtle"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              id="cycle-start-input"
              type="number"
              min={minCycle}
              max={cycleRange.end}
              value={startInput}
              disabled={disabled}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(startInput, 10);
                handleStartCommit(isNaN(parsed) ? cycleRange.start : parsed);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parsed = parseInt(startInput, 10);
                  handleStartCommit(isNaN(parsed) ? cycleRange.start : parsed);
                }
              }}
              aria-label="Start dataset cycle"
              className="flex-1 bg-slate-900 border border-border-subtle rounded px-2.5 py-1 text-center font-mono text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <button
              type="button"
              aria-label="Increment start cycle by 1"
              onClick={() => handleStartCommit(cycleRange.start + 1)}
              disabled={cycleRange.start >= cycleRange.end || disabled}
              className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded border border-border-subtle"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Increment start cycle by 10"
              onClick={() => handleStartCommit(cycleRange.start + 10)}
              disabled={cycleRange.start >= cycleRange.end || disabled}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-mono rounded border border-border-subtle"
            >
              +10
            </button>
          </div>

          {/* Start Slider */}
          <input
            type="range"
            min={minCycle}
            max={cycleRange.end}
            value={cycleRange.start}
            disabled={disabled}
            onChange={(e) => handleStartCommit(parseInt(e.target.value, 10))}
            aria-label="Start cycle slider"
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
          />
        </div>

        {/* End Cycle Control */}
        <div className="p-3 bg-navy-950 rounded-lg border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cycle-end-input"
              className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>End Dataset Cycle</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              [Min: {cycleRange.start}, Max: {maxCycle}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrement end cycle by 10"
              onClick={() => handleEndCommit(cycleRange.end - 10)}
              disabled={cycleRange.end <= cycleRange.start || disabled}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-mono rounded border border-border-subtle"
            >
              -10
            </button>
            <button
              type="button"
              aria-label="Decrement end cycle by 1"
              onClick={() => handleEndCommit(cycleRange.end - 1)}
              disabled={cycleRange.end <= cycleRange.start || disabled}
              className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded border border-border-subtle"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              id="cycle-end-input"
              type="number"
              min={cycleRange.start}
              max={maxCycle}
              value={endInput}
              disabled={disabled}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(endInput, 10);
                handleEndCommit(isNaN(parsed) ? cycleRange.end : parsed);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parsed = parseInt(endInput, 10);
                  handleEndCommit(isNaN(parsed) ? cycleRange.end : parsed);
                }
              }}
              aria-label="End dataset cycle"
              className="flex-1 bg-slate-900 border border-border-subtle rounded px-2.5 py-1 text-center font-mono text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <button
              type="button"
              aria-label="Increment end cycle by 1"
              onClick={() => handleEndCommit(cycleRange.end + 1)}
              disabled={cycleRange.end >= maxCycle || disabled}
              className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded border border-border-subtle"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Increment end cycle by 10"
              onClick={() => handleEndCommit(cycleRange.end + 10)}
              disabled={cycleRange.end >= maxCycle || disabled}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-mono rounded border border-border-subtle"
            >
              +10
            </button>
          </div>

          {/* End Slider */}
          <input
            type="range"
            min={cycleRange.start}
            max={maxCycle}
            value={cycleRange.end}
            disabled={disabled}
            onChange={(e) => handleEndCommit(parseInt(e.target.value, 10))}
            aria-label="End cycle slider"
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
          />
        </div>
      </div>

      {/* Preset Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle">
        <span className="text-[11px] font-mono text-slate-400 mr-1">
          Quick Range Presets:
        </span>

        <button
          type="button"
          onClick={handlePresetFull}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
            isFullRange
              ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-semibold'
              : 'bg-navy-950 hover:bg-slate-850 border-border-subtle text-slate-300'
          }`}
        >
          All ({totalCycles} cycles)
        </button>

        {totalCycles >= 30 && (
          <button
            type="button"
            onClick={handlePresetLast30}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              cycleRange.end === maxCycle && cycleRange.start === Math.max(minCycle, maxCycle - 29)
                ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-semibold'
                : 'bg-navy-950 hover:bg-slate-850 border-border-subtle text-slate-300'
            }`}
          >
            Terminal 30 Cycles
          </button>
        )}

        {totalCycles >= 50 && (
          <button
            type="button"
            onClick={handlePresetLast50}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              cycleRange.end === maxCycle && cycleRange.start === Math.max(minCycle, maxCycle - 49)
                ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-semibold'
                : 'bg-navy-950 hover:bg-slate-850 border-border-subtle text-slate-300'
            }`}
          >
            Terminal 50 Cycles
          </button>
        )}

        {totalCycles >= 30 && (
          <button
            type="button"
            onClick={handlePresetFirst30}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              cycleRange.start === minCycle && cycleRange.end === Math.min(minCycle + 29, maxCycle)
                ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-semibold'
                : 'bg-navy-950 hover:bg-slate-850 border-border-subtle text-slate-300'
            }`}
          >
            Initial 30 Cycles
          </button>
        )}
      </div>

      {/* Disambiguation Footnote */}
      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-900">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Telemetry View Notice:</strong> Modifying the chart cycle range only filters the visual display of chronological signals. It does not alter the Stacked LSTM 30-cycle observation window or trigger predictive inference.
        </span>
      </div>
    </Card>
  );
});

CycleRangeControls.displayName = 'CycleRangeControls';
