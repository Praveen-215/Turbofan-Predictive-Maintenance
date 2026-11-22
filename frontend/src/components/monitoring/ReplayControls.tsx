import React, { memo, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  History,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export interface ReplayControlsProps {
  /** Current active replay end cycle (the terminal cycle of the 30-cycle observation window) */
  replayEndCycle: number;
  /** Minimum selectable replay cycle (earliest cycle with valid 30-cycle history: first_cycle + 29) */
  minReplayCycle: number;
  /** Maximum selectable replay cycle (last recorded cycle for this engine) */
  maxReplayCycle: number;
  /** Whether playback simulation is currently running */
  isPlaying: boolean;
  /** Callback to toggle play/pause */
  onTogglePlayback: () => void;
  /** Callback to step forward 1 dataset cycle */
  onStepForward: () => void;
  /** Callback to step backward 1 dataset cycle */
  onStepBackward: () => void;
  /** Callback to jump to a specific replay end cycle */
  onReplayCycleChange: (cycle: number) => void;
  /** Optional active playback speed multiplier (default: 1) */
  playbackSpeed?: number;
  /** Optional callback when playback speed is changed (e.g. 0.5x, 1x, 2x, 4x) */
  onPlaybackSpeedChange?: (speed: number) => void;
  /** Loading or disabled state */
  disabled?: boolean;
  /** Optional container class name */
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

export const ReplayControls: React.FC<ReplayControlsProps> = memo(({
  replayEndCycle,
  minReplayCycle,
  maxReplayCycle,
  isPlaying,
  onTogglePlayback,
  onStepForward,
  onStepBackward,
  onReplayCycleChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  disabled = false,
  className = '',
}) => {
  // Support both controlled and uncontrolled playback speed state
  const [internalSpeed, setInternalSpeed] = useState<number>(1);
  const currentSpeed = playbackSpeed ?? internalSpeed;

  const handleSpeedSelect = useCallback(
    (speed: number) => {
      setInternalSpeed(speed);
      onPlaybackSpeedChange?.(speed);
    },
    [onPlaybackSpeedChange]
  );

  // Validate replay boundaries
  const isWindowAvailable = maxReplayCycle >= minReplayCycle && !disabled;
  const totalReplaySteps = maxReplayCycle >= minReplayCycle ? maxReplayCycle - minReplayCycle + 1 : 0;
  const currentStepIndex = Math.max(0, replayEndCycle - minReplayCycle + 1);

  // Jump to first valid replay cycle
  const handleJumpToStart = useCallback(() => {
    if (isWindowAvailable) {
      onReplayCycleChange(minReplayCycle);
    }
  }, [isWindowAvailable, minReplayCycle, onReplayCycleChange]);

  // Jump to terminal replay cycle
  const handleJumpToEnd = useCallback(() => {
    if (isWindowAvailable) {
      onReplayCycleChange(maxReplayCycle);
    }
  }, [isWindowAvailable, maxReplayCycle, onReplayCycleChange]);

  // Can step conditions
  const canStepBackward = replayEndCycle > minReplayCycle && !isPlaying && !disabled && isWindowAvailable;
  const canStepForward = replayEndCycle < maxReplayCycle && !isPlaying && !disabled && isWindowAvailable;

  if (!isWindowAvailable) {
    return (
      <Card className={`p-4 flex flex-col gap-3 text-xs font-mono text-slate-400 ${className}`}>
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-semibold uppercase tracking-wider">
            Historical Replay Unavailable
          </span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Historical replay requires at least 30 recorded cycles to form a valid Stacked LSTM observation window.
          This engine has fewer than 30 cycles recorded.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 flex flex-col gap-4 ${className}`}>
      {/* Header and Replay Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
            Historical Telemetry Replay
          </h3>
          <Badge variant={isPlaying ? 'cyan' : 'slate'} dot>
            {isPlaying ? 'Replay Running' : 'Replay Paused'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Step {currentStepIndex} of {totalReplaySteps}</span>
        </div>
      </div>

      {/* Observation Window & Position Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-navy-950/80 border border-border-subtle font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
            Replay End Cycle (Observation Horizon)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-lg">
              Cycle #{replayEndCycle}
            </span>
            <span className="text-slate-500 text-[11px]">
              (Range: {minReplayCycle} – {maxReplayCycle})
            </span>
          </div>
        </div>

        <div className="sm:text-right space-y-1 sm:border-l sm:border-border-subtle sm:pl-4 pt-2 sm:pt-0 border-t border-border-subtle sm:border-t-0">
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
            Active 30-Cycle Input Slice
          </span>
          <span className="text-emerald-400 font-semibold text-sm">
            Cycles {Math.max(1, replayEndCycle - 29)} – {replayEndCycle}
          </span>
        </div>
      </div>

      {/* Interactive Playback Scrub Slider */}
      <div className="space-y-1.5 px-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Cycle {minReplayCycle} (Start)</span>
          <span className="text-cyan-400 font-semibold">
            Replay Position: Cycle {replayEndCycle}
          </span>
          <span>Cycle {maxReplayCycle} (Terminal)</span>
        </div>

        <input
          type="range"
          min={minReplayCycle}
          max={maxReplayCycle}
          value={replayEndCycle}
          disabled={disabled || isPlaying}
          onChange={(e) => onReplayCycleChange(parseInt(e.target.value, 10))}
          aria-label="Historical replay timeline position"
          aria-valuemin={minReplayCycle}
          aria-valuemax={maxReplayCycle}
          aria-valuenow={replayEndCycle}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Primary Transport Controls & Playback Speed Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Playback Buttons Group */}
        <div className="flex items-center gap-2">
          {/* Jump to Earliest Valid Cycle */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleJumpToStart}
            disabled={replayEndCycle <= minReplayCycle || isPlaying || disabled}
            aria-label="Jump to earliest valid replay cycle"
            className="px-2 font-mono text-xs"
          >
            Start
          </Button>

          {/* Step Backward */}
          <Button
            size="sm"
            variant="secondary"
            onClick={onStepBackward}
            disabled={!canStepBackward}
            aria-label="Step backward 1 dataset cycle"
            icon={<SkipBack className="w-4 h-4" />}
            className="px-2.5"
          />

          {/* Play / Pause Toggle */}
          <Button
            size="sm"
            variant={isPlaying ? 'secondary' : 'primary'}
            onClick={onTogglePlayback}
            disabled={disabled}
            aria-label={isPlaying ? 'Pause historical replay' : 'Start historical replay'}
            icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            className="min-w-[100px] font-mono text-xs font-semibold"
          >
            {isPlaying ? 'Pause' : 'Play Replay'}
          </Button>

          {/* Step Forward */}
          <Button
            size="sm"
            variant="secondary"
            onClick={onStepForward}
            disabled={!canStepForward}
            aria-label="Step forward 1 dataset cycle"
            icon={<SkipForward className="w-4 h-4" />}
            className="px-2.5"
          />

          {/* Jump to Terminal Cycle */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleJumpToEnd}
            disabled={replayEndCycle >= maxReplayCycle || isPlaying || disabled}
            aria-label="Jump to terminal replay cycle"
            className="px-2 font-mono text-xs"
          >
            End
          </Button>
        </div>

        {/* Playback Speed Multipliers */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-xs">
          <span className="text-[11px] text-slate-400 mr-1">Speed:</span>
          {PLAYBACK_SPEEDS.map((speed) => {
            const isActive = currentSpeed === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedSelect(speed)}
                disabled={disabled}
                aria-label={`Set playback speed to ${speed}x`}
                className={`px-2 py-1 rounded text-xs transition-colors border ${
                  isActive
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold'
                    : 'bg-navy-950 hover:bg-slate-850 border-border-subtle text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Disambiguation and Scientific Non-Operational Notice */}
      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded border border-slate-900">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Historical Simulation Replay:</strong> This interface steps chronologically through recorded NASA C-MAPSS FD001 test-fleet dataset cycles. It does not interface with live aircraft systems or represent real-time streaming avionics.
        </span>
      </div>
    </Card>
  );
});

ReplayControls.displayName = 'ReplayControls';
