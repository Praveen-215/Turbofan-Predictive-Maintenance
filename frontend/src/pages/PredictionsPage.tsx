import React, { useState, useCallback, useMemo } from 'react';
import {
  Zap,
  RotateCcw,
  Download,
  FileCode,
  Square,
  Filter,
  X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import {
  PredictionProvenanceBanner,
  PredictionSummaryCards,
  PredictionDistributionChart,
  PredictionFleetTable,
  PredictionInspectorCard,
} from '../components/predictions';
import { useFleetPredictions } from '../hooks/useFleetPredictions';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { RulHistogramBin } from '../types/prediction';

/**
 * PredictionsPage
 * Complete AI Predictive Maintenance Dashboard orchestrating fleet-wide
 * Stacked LSTM Remaining Useful Life (RUL) inference across all 100 NASA C-MAPSS FD001 test engines.
 */
export const PredictionsPage: React.FC = () => {
  const { status: healthStatus, health, checkHealth } = useHealthCheck();

  const {
    predictionList,
    predictions,
    progress,
    summary,
    histogramBins,
    isEvaluatingFleet,
    evaluateFleet,
    cancelFleetEvaluation,
    evaluateEngine,
    retryEngine,
    resetPredictions,
    exportToCsv,
    exportToJson,
  } = useFleetPredictions();

  // Selected engine ID for inspector panel
  const [selectedEngineId, setSelectedEngineId] = useState<number | null>(null);

  // Selected histogram bin for filtering table view
  const [selectedBin, setSelectedBin] = useState<RulHistogramBin | null>(null);

  // Derive selected engine record reactively from predictions map
  const selectedEngine = useMemo(() => {
    if (selectedEngineId === null) return null;
    return predictions.get(selectedEngineId) || null;
  }, [predictions, selectedEngineId]);

  // Filter table by selected histogram bin if active
  const tablePredictions = useMemo(() => {
    if (!selectedBin) return predictionList;
    const targetIds = new Set(selectedBin.engineIds);
    return predictionList.filter((item) => targetIds.has(item.engineId));
  }, [predictionList, selectedBin]);

  // User control handlers
  const handleStartFleet = useCallback(async () => {
    if (isEvaluatingFleet) return;
    await evaluateFleet();
  }, [isEvaluatingFleet, evaluateFleet]);

  const handleCancelFleet = useCallback(() => {
    cancelFleetEvaluation();
  }, [cancelFleetEvaluation]);

  const handleReset = useCallback(() => {
    resetPredictions();
    setSelectedBin(null);
  }, [resetPredictions]);

  const handleSelectEngine = useCallback((item: { engineId: number }) => {
    setSelectedEngineId(item.engineId);
  }, []);

  const handleEvaluateSingle = useCallback(
    async (engineId: number) => {
      await evaluateEngine(engineId);
    },
    [evaluateEngine]
  );

  const handleRetry = useCallback(
    async (engineId: number) => {
      await retryEngine(engineId);
    },
    [retryEngine]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Header */}
      <Header
        title="AI Predictions"
        subtitle="NASA C-MAPSS FD001 Stacked LSTM Remaining Useful Life (RUL) Inference Engine"
        status={healthStatus}
        modelName={health?.model_name || 'Stacked LSTM (64/32 units)'}
        onRefresh={checkHealth}
      />

      {/* Main Dashboard Canvas */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* Backend Offline Banner */}
        {healthStatus === 'offline' && (
          <ErrorAlert
            title="TURBOGUARD AI Backend Offline"
            message="Cannot establish communication with the FastAPI inference service at http://127.0.0.1:8000/api/v1. Start the backend server to execute model inference."
            isOffline={true}
            onRetry={checkHealth}
          />
        )}

        {/* 1. Fleet Evaluation Controls Toolbar */}
        <Card className="p-4 sm:p-5 flex flex-col gap-4 border-cyan-800/40 bg-navy-900/90 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Primary Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                onClick={handleStartFleet}
                disabled={isEvaluatingFleet}
                loading={isEvaluatingFleet}
                icon={<Zap className="w-4 h-4 fill-current" />}
                className="font-mono text-xs font-bold px-4 py-2"
              >
                {isEvaluatingFleet
                  ? 'Evaluating Test Fleet...'
                  : summary.successfulCount === 100
                  ? 'Re-evaluate All 100 Units'
                  : 'Run Fleet Inference (100 Units)'}
              </Button>

              <Button
                variant="danger"
                onClick={handleCancelFleet}
                disabled={!isEvaluatingFleet}
                icon={<Square className="w-3.5 h-3.5 fill-current" />}
                className="font-mono text-xs py-2"
              >
                Cancel Evaluation
              </Button>

              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={isEvaluatingFleet}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="font-mono text-xs py-2 text-slate-300"
              >
                Reset Predictions
              </Button>
            </div>

            {/* Native Client-Side Export Controls */}
            <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
              <span className="text-[11px] font-mono text-slate-400 mr-1 hidden sm:inline">
                Export Predictions:
              </span>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportToCsv()}
                disabled={summary.evaluatedCount === 0}
                icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
                className="font-mono text-xs"
                title="Download evaluated turbofan predictions as CSV"
              >
                CSV
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportToJson()}
                disabled={summary.evaluatedCount === 0}
                icon={<FileCode className="w-3.5 h-3.5 text-cyan-400" />}
                className="font-mono text-xs"
                title="Download evaluated turbofan predictions as JSON"
              >
                JSON
              </Button>
            </div>
          </div>

          {/* Progress Bar and Real-Time Worker Telemetry */}
          {(isEvaluatingFleet || progress.completed > 0) && (
            <div className="pt-3 border-t border-border-subtle space-y-2.5">
              <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">
                    Progress: {progress.completed} / {progress.total} units ({progress.percent}%)
                  </span>
                  {isEvaluatingFleet && (
                    <Badge variant="cyan" dot>
                      {progress.activeWorkerCount} active request{progress.activeWorkerCount === 1 ? '' : 's'} (concurrency cap: 4)
                    </Badge>
                  )}
                  {!isEvaluatingFleet && progress.percent === 100 && (
                    <Badge variant="emerald" dot>
                      Fleet Complete
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span>
                    Success: <strong className="text-emerald-400">{progress.successful}</strong>
                  </span>
                  <span>
                    Errors: <strong className="text-rose-400">{progress.failed}</strong>
                  </span>
                  <span>
                    Elapsed:{' '}
                    <strong className="text-slate-200">{progress.elapsedSeconds}s</strong>
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-slate-900 border border-border-subtle overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isEvaluatingFleet
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse'
                      : progress.completed === progress.total
                      ? 'bg-emerald-500'
                      : 'bg-cyan-600'
                  }`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Operational Boundary Notice */}
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                {isEvaluatingFleet
                  ? 'Client-side queue orchestrator strictly limits simultaneous network inference to four active HTTP requests. Evaluations persist across page navigation.'
                  : 'Cancellation note: Outstanding network requests finish naturally, but late responses and errors are safely discarded by the store epoch ownership guard.'}
              </p>
            </div>
          )}
        </Card>

        {/* 2. Model & Inference Provenance Banner */}
        <PredictionProvenanceBanner />

        {/* 3. Aggregated Summary Metrics Cards */}
        <PredictionSummaryCards summary={summary} progress={progress} />

        {/* 4. Descriptive Frequency Distribution Chart */}
        <div className="space-y-3">
          <PredictionDistributionChart
            histogramBins={histogramBins}
            onSelectBin={(bin) => {
              setSelectedBin((prev) => (prev?.range === bin.range ? null : bin));
            }}
            selectedRange={selectedBin?.range}
          />

          {/* Active Chart Filter Banner */}
          {selectedBin && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-lg flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-300">
                <Filter className="w-3.5 h-3.5" />
                <span>Filtering table to predicted RUL interval:</span>
                <Badge variant="cyan" className="font-bold">
                  {selectedBin.range} cycles ({tablePredictions.length} engines)
                </Badge>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedBin(null)}
                icon={<X className="w-3.5 h-3.5" />}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {/* 5. Fleet Predictions Table and Selected Unit Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Table (2 Columns on large screens) */}
          <div className="lg:col-span-2 space-y-3">
            <PredictionFleetTable
              predictions={tablePredictions}
              selectedEngineId={selectedEngineId}
              onSelectEngine={handleSelectEngine}
              onRetryEngine={handleRetry}
              isEvaluatingFleet={isEvaluatingFleet}
            />
          </div>

          {/* Inspector Panel (1 Column on large screens) */}
          <div className="lg:col-span-1 sticky top-20">
            <PredictionInspectorCard
              selectedEngine={selectedEngine}
              onEvaluateEngine={handleEvaluateSingle}
              onClose={() => setSelectedEngineId(null)}
              isEvaluating={isEvaluatingFleet}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
