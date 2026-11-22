import React, { useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Database, Sliders } from 'lucide-react';
import { useEngineTelemetry } from '../hooks/useEngineTelemetry';
import { SENSOR_METADATA_MAP, SensorMetadata } from '../types/sensors';
import { EngineSelectorBar } from '../components/monitoring/EngineSelectorBar';
import { EngineOverviewBanner } from '../components/monitoring/EngineOverviewBanner';
import { SubsystemFeatureTabs } from '../components/monitoring/SubsystemFeatureTabs';
import { TelemetryChart } from '../components/monitoring/TelemetryChart';
import { CycleRangeControls } from '../components/monitoring/CycleRangeControls';
import { ReplayControls } from '../components/monitoring/ReplayControls';
import { LivePredictionCard } from '../components/monitoring/LivePredictionCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ErrorAlert } from '../components/common/ErrorAlert';

/**
 * Strict integer validator for NASA C-MAPSS FD001 test engine units (1 to 100).
 * Rejects non-integers, decimals, negative values, and non-numeric strings.
 */
function parseStrictEngineId(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= 100) {
    return num;
  }
  return null;
}

export const EngineMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Strict parsing of URL query parameter (?id=X or ?engineId=X)
  const rawQuery = searchParams.get('id') || searchParams.get('engineId');
  const parsedEngineId = parseStrictEngineId(rawQuery);
  const targetEngineId = parsedEngineId ?? 1;

  // Single source of truth for telemetry, replay, and prediction states
  const telemetry = useEngineTelemetry({ initialEngineId: targetEngineId });

  // Handle user selecting an engine via UI selector bar: updates telemetry and query string
  const handleSelectEngine = useCallback(
    (newEngineId: number) => {
      if (newEngineId >= 1 && newEngineId <= 100 && newEngineId !== telemetry.selectedEngineId) {
        telemetry.selectEngine(newEngineId);
        setSearchParams({ id: String(newEngineId) });
      }
    },
    [telemetry.selectedEngineId, telemetry.selectEngine, setSearchParams]
  );

  // Synchronize telemetry state when engine in URL changes externally (e.g. browser back/forward or direct navigation)
  useEffect(() => {
    if (targetEngineId !== telemetry.selectedEngineId) {
      telemetry.selectEngine(targetEngineId);
    }
  }, [targetEngineId, telemetry.selectedEngineId, telemetry.selectEngine]);

  // Map selected feature keys to rich SensorMetadata objects for chart visualization
  const selectedSensorMetadata = useMemo<SensorMetadata[]>(() => {
    return telemetry.selectedFeatures
      .map((name) => SENSOR_METADATA_MAP[name])
      .filter((meta): meta is SensorMetadata => meta !== undefined);
  }, [telemetry.selectedFeatures]);

  // Min and max replay cycle boundaries
  const minReplayCycle = (telemetry.summary?.first_cycle ?? 1) + 29;
  const maxReplayCycle = telemetry.summary?.last_cycle ?? 31;
  const isPredictionReady = Boolean(telemetry.summary?.has_sufficient_history);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/')}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs font-mono"
            >
              Fleet Overview
            </Button>
            <Badge variant="cyan" dot>
              Phase 3B Telemetry Visualizer
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>Engine Monitoring & Telemetry Visualization</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl">
            Multi-sensor degradation trajectories, chronological replay transport, and decoupled on-demand Stacked LSTM Remaining Useful Life estimation for NASA C-MAPSS FD001 test engines.
          </p>
        </div>

        {/* Global Dataset Identity Badge */}
        <div className="self-start sm:self-auto bg-navy-950 px-3 py-2 rounded-lg border border-border-subtle text-xs font-mono">
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Dataset Benchmark
          </span>
          <span className="text-white font-semibold">
            NASA C-MAPSS FD001
          </span>
        </div>
      </div>

      {/* 1. Engine Selector Bar */}
      <EngineSelectorBar
        selectedEngineId={telemetry.selectedEngineId}
        onSelectEngine={handleSelectEngine}
        onRefresh={telemetry.refreshEngineData}
        loading={telemetry.loading}
        error={telemetry.error}
      />

      {/* Top-Level Communication Error Alert */}
      {telemetry.error && (
        <ErrorAlert
          title="Telemetry API Communication Error"
          message={telemetry.error.message}
          isOffline={telemetry.error.isOffline}
          onRetry={telemetry.refreshEngineData}
        />
      )}

      {/* 2. Engine Overview Banner */}
      <EngineOverviewBanner
        summary={telemetry.summary}
        loading={telemetry.summaryLoading}
      />

      {/* 3. Subsystem Feature Selection Tabs */}
      <SubsystemFeatureTabs
        selectedFeatures={telemetry.selectedFeatures}
        onToggleFeature={telemetry.toggleFeature}
        onSelectFeatures={telemetry.setSelectedFeatures}
      />

      {/* 4. Chronological Telemetry Chart Section */}
      <div className="space-y-2">
        {/* Chart View Toolbar: Raw vs. Normalized Scaling */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              Chart Signal Scaling:
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-navy-950 rounded-lg border border-border-subtle text-xs font-mono">
            <button
              type="button"
              onClick={() => telemetry.setIsNormalized(false)}
              aria-pressed={!telemetry.isNormalized}
              className={`px-2.5 py-1 rounded transition-colors text-xs ${
                !telemetry.isNormalized
                  ? 'bg-slate-800 text-white font-semibold border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Raw Physical Units
            </button>
            <button
              type="button"
              onClick={() => telemetry.setIsNormalized(true)}
              aria-pressed={telemetry.isNormalized}
              className={`px-2.5 py-1 rounded transition-colors text-xs ${
                telemetry.isNormalized
                  ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Normalized (0–100%)
            </button>
          </div>
        </div>

        {/* Telemetry Line Chart */}
        <TelemetryChart
          data={telemetry.chartData}
          selectedFeatures={selectedSensorMetadata}
          isNormalized={telemetry.isNormalized}
          loading={telemetry.telemetryLoading}
          observationWindow={telemetry.observationWindow}
        />
      </div>

      {/* 5. Dataset Cycle Range Filtering Controls */}
      <CycleRangeControls
        cycleRange={telemetry.cycleRange}
        minCycle={telemetry.summary?.first_cycle ?? 1}
        maxCycle={telemetry.summary?.last_cycle ?? 31}
        onRangeChange={telemetry.setCycleRange}
        onResetRange={telemetry.resetCycleRange}
        observationWindow={telemetry.observationWindow}
        loading={telemetry.telemetryLoading}
        disabled={telemetry.loading || !telemetry.summary}
      />

      {/* 6 & 7. Historical Replay Transport & AI Prediction Card (Side-by-Side on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Component 6: Replay Controls */}
        <ReplayControls
          replayEndCycle={telemetry.replayEndCycle}
          minReplayCycle={minReplayCycle}
          maxReplayCycle={maxReplayCycle}
          isPlaying={telemetry.isPlaying}
          onTogglePlayback={telemetry.togglePlayback}
          onStepForward={telemetry.stepForward}
          onStepBackward={telemetry.stepBackward}
          onReplayCycleChange={telemetry.setReplayEndCycle}
          playbackSpeed={telemetry.playbackSpeed}
          onPlaybackSpeedChange={telemetry.setPlaybackSpeed}
          disabled={telemetry.loading || !telemetry.summary || !isPredictionReady}
        />

        {/* Component 7: Live Prediction Card (AI RUL Estimation) */}
        <LivePredictionCard
          engineId={telemetry.selectedEngineId}
          observationWindow={telemetry.observationWindow}
          predictedRul={telemetry.predictedRul}
          predictionResult={telemetry.predictionResult}
          isPredicting={telemetry.isPredicting}
          predictionError={telemetry.predictionError}
          onEvaluatePrediction={telemetry.evaluatePrediction}
          onClearPrediction={telemetry.clearPrediction}
          disabled={telemetry.loading || !telemetry.observationWindow.isValid}
        />
      </div>
    </div>
  );
};

export default EngineMonitoringPage;
