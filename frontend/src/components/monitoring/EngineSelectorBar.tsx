import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Cpu } from 'lucide-react';
import { Button } from '../common/Button';
import { ApiError } from '../../types/api';

export interface EngineSelectorBarProps {
  selectedEngineId: number;
  onSelectEngine: (engineId: number) => void;
  onRefresh: () => void;
  loading?: boolean;
  error?: ApiError | null;
  className?: string;
}

// Generate the static array of 100 engine IDs (1 to 100)
const ALL_ENGINE_IDS = Array.from({ length: 100 }, (_, i) => i + 1);

export const EngineSelectorBar: React.FC<EngineSelectorBarProps> = memo(({
  selectedEngineId,
  onSelectEngine,
  onRefresh,
  loading = false,
  error = null,
  className = '',
}) => {
  const canGoPrevious = selectedEngineId > 1 && !loading;
  const canGoNext = selectedEngineId < 100 && !loading;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onSelectEngine(selectedEngineId - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onSelectEngine(selectedEngineId + 1);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      onSelectEngine(val);
    }
  };

  return (
    <div
      className={`bg-navy-900 border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${className}`}
    >
      {/* Engine Selection & Stepper Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <label
            htmlFor="turboguard-engine-select"
            className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
          >
            Engine Unit:
          </label>
        </div>

        {/* Stepper: Previous */}
        <Button
          size="sm"
          variant="secondary"
          disabled={!canGoPrevious}
          onClick={handlePrevious}
          aria-label="Select previous engine unit"
          icon={<ChevronLeft className="w-4 h-4" />}
          className="px-2"
        />

        {/* Accessible Dropdown Selector for Engines 1-100 */}
        <select
          id="turboguard-engine-select"
          value={selectedEngineId}
          onChange={handleSelectChange}
          disabled={loading}
          aria-label="Select turbofan engine by unit ID"
          className="bg-navy-950 border border-border-subtle text-slate-100 text-xs font-mono font-medium rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 cursor-pointer"
        >
          {ALL_ENGINE_IDS.map((id) => (
            <option key={id} value={id}>
              Engine #{id.toString().padStart(3, '0')} (FD001 Unit {id})
            </option>
          ))}
        </select>

        {/* Stepper: Next */}
        <Button
          size="sm"
          variant="secondary"
          disabled={!canGoNext}
          onClick={handleNext}
          aria-label="Select next engine unit"
          icon={<ChevronRight className="w-4 h-4" />}
          className="px-2"
        />

        {/* Index indicator */}
        <span className="text-[11px] font-mono text-slate-400 hidden md:inline-block">
          Unit {selectedEngineId} of 100
        </span>
      </div>

      {/* Actions and Status */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5">
        {error && (
          <span className="text-[11px] text-rose-400 font-medium truncate max-w-xs" role="alert">
            {error.message}
          </span>
        )}

        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          loading={loading}
          disabled={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          title="Reload engine summary and telemetry records from API"
        >
          Refresh Data
        </Button>
      </div>
    </div>
  );
});

EngineSelectorBar.displayName = 'EngineSelectorBar';
