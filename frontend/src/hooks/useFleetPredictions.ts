import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import {
  FleetPredictionItem,
  FleetPredictionProgress,
  FleetPredictionSummary,
  RulHistogramBin,
} from '../types/prediction';
import { ApiError } from '../types/api';

const TOTAL_BENCHMARK_ENGINES = 100;
const GLOBAL_CONCURRENCY_LIMIT = 4;

/**
 * Global Bounded Request Scheduler.
 * Strictly guarantees that no more than four actual getEngineReplay() HTTP requests
 * are active simultaneously across all fleet workers, individual retries, and restarts.
 */
class GlobalRequestScheduler {
  private activeCount = 0;
  private readonly maxConcurrency = GLOBAL_CONCURRENCY_LIMIT;
  private readonly waitQueue: Array<() => void> = [];

  public get activeRequests(): number {
    return this.activeCount;
  }

  public async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(() => {
        this.activeCount++;
        resolve();
      });
    });
  }

  public release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.waitQueue.length > 0 && this.activeCount < this.maxConcurrency) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }
}

const scheduler = new GlobalRequestScheduler();

/**
 * Creates the initial empty inventory of 100 NASA C-MAPSS FD001 benchmark test engines.
 */
function createInitialPredictions(): Map<number, FleetPredictionItem> {
  const map = new Map<number, FleetPredictionItem>();
  for (let id = 1; id <= TOTAL_BENCHMARK_ENGINES; id++) {
    map.set(id, {
      engineId: id,
      totalCycles: 0,
      windowStartCycle: 0,
      windowEndCycle: 0,
      predictedRul: null,
      status: 'pending',
      evaluatedAt: null,
      error: null,
    });
  }
  return map;
}

/**
 * Module-level shared prediction state to guarantee persistence across route navigation.
 * When an operator moves between Predictions and Monitoring, in-progress evaluations
 * and completed inference records are retained.
 */
interface ModulePredictionState {
  predictions: Map<number, FleetPredictionItem>;
  isRunning: boolean;
  activeWorkers: number;
  runId: number;
  storeEpoch: number;
  engineGenerations: Map<number, number>;
  isCancelled: boolean;
  elapsedSeconds: number;
  timerId: ReturnType<typeof setInterval> | null;
}

const moduleStore: ModulePredictionState = {
  predictions: createInitialPredictions(),
  isRunning: false,
  activeWorkers: 0,
  runId: 0,
  storeEpoch: 1,
  engineGenerations: new Map<number, number>(),
  isCancelled: false,
  elapsedSeconds: 0,
  timerId: null,
};

type StateChangeListener = () => void;
const listeners = new Set<StateChangeListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Guard against individual listener unmount anomalies
    }
  });
}

function startElapsedTimer() {
  if (moduleStore.timerId !== null) return;
  moduleStore.timerId = setInterval(() => {
    if (moduleStore.isRunning) {
      moduleStore.elapsedSeconds += 1;
      notifyListeners();
    } else {
      stopElapsedTimer();
    }
  }, 1000);
}

function stopElapsedTimer() {
  if (moduleStore.timerId !== null) {
    clearInterval(moduleStore.timerId);
    moduleStore.timerId = null;
  }
}

/**
 * CSV field escaping helper ensuring quotes, line breaks, and commas are properly escaped.
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export interface UseFleetPredictionsResult {
  /** Map of all 100 benchmark test engines keyed by engine unit ID */
  predictions: Map<number, FleetPredictionItem>;
  /** Array representation of all 100 benchmark engine prediction items */
  predictionList: FleetPredictionItem[];
  /** Execution progress tracking attempts, success, failures, and concurrency */
  progress: FleetPredictionProgress;
  /** Fleet-level prediction summary metrics */
  summary: FleetPredictionSummary;
  /** Descriptive predicted-RUL frequency histogram bins */
  histogramBins: RulHistogramBin[];
  /** Whether the worker pool is actively executing inference */
  isEvaluatingFleet: boolean;
  /** Evaluates all 100 benchmark test engines using the shared concurrency scheduler */
  evaluateFleet: () => Promise<void>;
  /** Cancels the queued fleet evaluation gracefully without discarding completed results */
  cancelFleetEvaluation: () => void;
  /** Evaluates inference for an individual engine unit (1–100) using the shared scheduler */
  evaluateEngine: (engineId: number) => Promise<void>;
  /** Retries evaluation for a specific failed engine unit */
  retryEngine: (engineId: number) => Promise<void>;
  /** Resets all evaluated predictions back to pending initial state */
  resetPredictions: () => void;
  /** Triggers native client-side download of evaluated predictions as CSV */
  exportToCsv: (customFilename?: string) => boolean;
  /** Triggers native client-side download of evaluated predictions as JSON */
  exportToJson: (customFilename?: string) => boolean;
}

/**
 * Hook orchestrating client-side fleet-wide Stacked LSTM Remaining Useful Life inference
 * across the 100 NASA C-MAPSS FD001 benchmark test engines with guaranteed global concurrency limits.
 */
export function useFleetPredictions(): UseFleetPredictionsResult {
  const [tick, setTick] = useState(0);

  // Subscribe to module-level store changes
  useEffect(() => {
    const handleStoreChange = () => setTick((prev) => prev + 1);
    listeners.add(handleStoreChange);
    return () => {
      listeners.delete(handleStoreChange);
    };
  }, []);

  // Compute progress object based on completed attempts (success + error)
  const progress: FleetPredictionProgress = useMemo(() => {
    let completed = 0;
    let successful = 0;
    let failed = 0;

    moduleStore.predictions.forEach((item) => {
      if (item.status === 'success') {
        successful++;
        completed++;
      } else if (item.status === 'error') {
        failed++;
        completed++;
      }
    });

    const percent =
      TOTAL_BENCHMARK_ENGINES > 0
        ? Math.round((completed / TOTAL_BENCHMARK_ENGINES) * 100)
        : 0;

    return {
      total: TOTAL_BENCHMARK_ENGINES,
      completed,
      successful,
      failed,
      percent,
      isRunning: moduleStore.isRunning,
      activeWorkerCount: moduleStore.activeWorkers,
      elapsedSeconds: moduleStore.elapsedSeconds,
    };
  }, [tick]);

  // Compute aggregated fleet summary metrics
  const summary: FleetPredictionSummary = useMemo(() => {
    let successfulCount = 0;
    let failedCount = 0;
    let sumRul = 0;
    let minRul: number | null = null;
    let minRulEngineId: number | null = null;
    let maxRul: number | null = null;
    let maxRulEngineId: number | null = null;

    moduleStore.predictions.forEach((item) => {
      if (item.status === 'success' && typeof item.predictedRul === 'number') {
        successfulCount++;
        sumRul += item.predictedRul;

        if (minRul === null || item.predictedRul < minRul) {
          minRul = item.predictedRul;
          minRulEngineId = item.engineId;
        }

        if (maxRul === null || item.predictedRul > maxRul) {
          maxRul = item.predictedRul;
          maxRulEngineId = item.engineId;
        }
      } else if (item.status === 'error') {
        failedCount++;
      }
    });

    return {
      totalEngines: TOTAL_BENCHMARK_ENGINES,
      evaluatedCount: successfulCount + failedCount,
      successfulCount,
      failedCount,
      meanRul: successfulCount > 0 ? sumRul / successfulCount : null,
      minRul,
      minRulEngineId,
      maxRul,
      maxRulEngineId,
    };
  }, [tick]);

  // Compute descriptive predicted-RUL frequency histogram bins
  const histogramBins: RulHistogramBin[] = useMemo(() => {
    const rawBins = [
      { range: '< 0', min: -Infinity, max: -0.000001, count: 0, engineIds: [] as number[] },
      { range: '0–25', min: 0, max: 25, count: 0, engineIds: [] as number[] },
      { range: '26–50', min: 25.000001, max: 50, count: 0, engineIds: [] as number[] },
      { range: '51–75', min: 50.000001, max: 75, count: 0, engineIds: [] as number[] },
      { range: '76–100', min: 75.000001, max: 100, count: 0, engineIds: [] as number[] },
      { range: '101–125', min: 100.000001, max: 125, count: 0, engineIds: [] as number[] },
      { range: '> 125', min: 125.000001, max: Infinity, count: 0, engineIds: [] as number[] },
    ];

    let totalValid = 0;
    moduleStore.predictions.forEach((item) => {
      if (item.status === 'success' && typeof item.predictedRul === 'number') {
        totalValid++;
        const rul = item.predictedRul;
        for (const b of rawBins) {
          if (rul >= b.min && rul <= b.max) {
            b.count++;
            b.engineIds.push(item.engineId);
            break;
          }
        }
      }
    });

    return rawBins.map((b) => ({
      ...b,
      percentage: totalValid > 0 ? Number(((b.count / totalValid) * 100).toFixed(1)) : 0,
    }));
  }, [tick]);

  // Single-engine evaluation helper acquiring from shared global scheduler
  const evaluateEngine = useCallback(async (engineId: number) => {
    if (engineId < 1 || engineId > TOTAL_BENCHMARK_ENGINES || !Number.isInteger(engineId)) {
      return;
    }

    const currentItem = moduleStore.predictions.get(engineId);
    if (currentItem && currentItem.status === 'evaluating') {
      return; // Do not create duplicate requests for an engine currently evaluating
    }

    // A. Before scheduler acquisition: Capture operation ownership
    const capturedEpoch = moduleStore.storeEpoch;
    const currentGen = (moduleStore.engineGenerations.get(engineId) || 0) + 1;
    moduleStore.engineGenerations.set(engineId, currentGen);

    if (currentItem) {
      currentItem.status = 'evaluating';
      notifyListeners();
    }

    // Acquire global slot (ensuring global active requests <= 4)
    await scheduler.acquire();

    try {
      // B. Immediately after await scheduler.acquire():
      // Check whether the captured store epoch and engine generation are still current.
      if (
        moduleStore.storeEpoch !== capturedEpoch ||
        moduleStore.engineGenerations.get(engineId) !== currentGen
      ) {
        // Obsolete! Do not dispatch HTTP. Slot will be released in finally.
        return;
      }

      try {
        // Calls backend replay endpoint with terminal observation window (end_cycle omitted)
        const replay = await api.getEngineReplay(engineId, undefined, true);
        const predictedRul = replay.predicted_rul ?? null;

        // C. After await api.getEngineReplay(...): Re-check ownership before writing a successful prediction
        if (
          moduleStore.storeEpoch === capturedEpoch &&
          moduleStore.engineGenerations.get(engineId) === currentGen
        ) {
          moduleStore.predictions.set(engineId, {
            engineId,
            totalCycles: replay.end_cycle,
            windowStartCycle: replay.start_cycle,
            windowEndCycle: replay.end_cycle,
            predictedRul, // Exact unclipped precision preserved directly from backend
            status: 'success',
            evaluatedAt: new Date().toISOString(), // Client-side arrival timestamp
            error: null,
          });
        }
      } catch (err: unknown) {
        // D. In catch: Re-check ownership before writing an error state
        if (
          moduleStore.storeEpoch === capturedEpoch &&
          moduleStore.engineGenerations.get(engineId) === currentGen
        ) {
          const apiErr = err as ApiError;
          const message = apiErr?.message || (err instanceof Error ? err.message : 'Evaluation request failed');

          moduleStore.predictions.set(engineId, {
            engineId,
            totalCycles: currentItem?.totalCycles || 0,
            windowStartCycle: currentItem?.windowStartCycle || 0,
            windowEndCycle: currentItem?.windowEndCycle || 0,
            predictedRul: null,
            status: 'error',
            evaluatedAt: new Date().toISOString(),
            error: message,
          });
        }
      }
    } finally {
      // E. In finally:
      // Release the acquired scheduler slot exactly once.
      scheduler.release();
      // Do not update state for an obsolete operation.
      if (
        moduleStore.storeEpoch === capturedEpoch &&
        moduleStore.engineGenerations.get(engineId) === currentGen
      ) {
        notifyListeners();
      }
    }
  }, []);

  // Retry an individual failed engine
  const retryEngine = useCallback(
    async (engineId: number) => {
      await evaluateEngine(engineId);
    },
    [evaluateEngine]
  );

  // Fleet-wide inference execution with bounded concurrency scheduler
  const evaluateFleet = useCallback(async () => {
    if (moduleStore.isRunning) {
      return; // Prevent duplicate fleet evaluation runs
    }

    moduleStore.isRunning = true;
    moduleStore.isCancelled = false;
    moduleStore.runId += 1;
    moduleStore.storeEpoch += 1;
    const currentRunId = moduleStore.runId;
    const currentEpoch = moduleStore.storeEpoch;
    moduleStore.activeWorkers = 0;
    moduleStore.elapsedSeconds = 0;
    startElapsedTimer();

    // Prepare queue of engine IDs (1 to 100)
    const queue: number[] = [];
    for (let id = 1; id <= TOTAL_BENCHMARK_ENGINES; id++) {
      queue.push(id);
    }

    notifyListeners();

    // Worker function: pulls next engine ID from queue while available and not cancelled
    const runWorker = async () => {
      while (queue.length > 0) {
        if (
          moduleStore.isCancelled ||
          moduleStore.runId !== currentRunId ||
          moduleStore.storeEpoch !== currentEpoch
        ) {
          break; // Stop worker consumption immediately on cancellation or newer run/epoch
        }

        // Acquire one of the four global request slots
        await scheduler.acquire();

        try {
          // Immediately after acquiring slot, re-check cancellation, run identity, and store epoch
          if (
            moduleStore.isCancelled ||
            moduleStore.runId !== currentRunId ||
            moduleStore.storeEpoch !== currentEpoch
          ) {
            break;
          }

          const engineId = queue.shift();
          if (engineId === undefined) {
            break;
          }

          // Assign engine generation for this evaluation
          const currentEngineGen = (moduleStore.engineGenerations.get(engineId) || 0) + 1;
          moduleStore.engineGenerations.set(engineId, currentEngineGen);

          // Mark evaluating
          const currentItem = moduleStore.predictions.get(engineId);
          if (currentItem) {
            currentItem.status = 'evaluating';
          }
          if (moduleStore.runId === currentRunId) {
            moduleStore.activeWorkers++;
          }
          notifyListeners();

          try {
            // Terminal 30-cycle observation window: end_cycle omitted to use backend default
            const replay = await api.getEngineReplay(engineId, undefined, true);

            // Stale response guard: ensure response only writes if this run and engine generation are still current and active
            if (
              moduleStore.runId === currentRunId &&
              !moduleStore.isCancelled &&
              moduleStore.storeEpoch === currentEpoch &&
              moduleStore.engineGenerations.get(engineId) === currentEngineGen
            ) {
              moduleStore.predictions.set(engineId, {
                engineId,
                totalCycles: replay.end_cycle,
                windowStartCycle: replay.start_cycle,
                windowEndCycle: replay.end_cycle,
                predictedRul: replay.predicted_rul ?? null, // Exact precision preserved
                status: 'success',
                evaluatedAt: new Date().toISOString(), // Client timestamp
                error: null,
              });
            }
          } catch (err: unknown) {
            // Partial-failure resilience: capture error per engine and continue remaining queue
            if (
              moduleStore.runId === currentRunId &&
              !moduleStore.isCancelled &&
              moduleStore.storeEpoch === currentEpoch &&
              moduleStore.engineGenerations.get(engineId) === currentEngineGen
            ) {
              const apiErr = err as ApiError;
              const message = apiErr?.message || (err instanceof Error ? err.message : 'Evaluation error');

              moduleStore.predictions.set(engineId, {
                engineId,
                totalCycles: currentItem?.totalCycles || 0,
                windowStartCycle: currentItem?.windowStartCycle || 0,
                windowEndCycle: currentItem?.windowEndCycle || 0,
                predictedRul: null,
                status: 'error',
                evaluatedAt: new Date().toISOString(),
                error: message,
              });
            }
          } finally {
            // Decrement activeWorkers only if belonging to the current run
            if (moduleStore.runId === currentRunId) {
              moduleStore.activeWorkers = Math.max(0, moduleStore.activeWorkers - 1);
            }
            notifyListeners();
          }
        } finally {
          scheduler.release();
        }
      }
    };

    try {
      // Spawn exactly four concurrent workers
      const workers: Promise<void>[] = [];
      const workerCount = Math.min(GLOBAL_CONCURRENCY_LIMIT, queue.length);
      for (let i = 0; i < workerCount; i++) {
        workers.push(runWorker());
      }

      await Promise.all(workers);
    } finally {
      if (moduleStore.runId === currentRunId) {
        moduleStore.isRunning = false;
        moduleStore.activeWorkers = 0;
        stopElapsedTimer();
        notifyListeners();
      }
    }
  }, []);

  // Cancel ongoing fleet evaluation
  const cancelFleetEvaluation = useCallback(() => {
    if (!moduleStore.isRunning) return;

    moduleStore.isCancelled = true;
    moduleStore.isRunning = false;
    moduleStore.activeWorkers = 0;
    moduleStore.runId += 1; // Invalidate run immediately so in-flight responses cannot write or corrupt workers
    moduleStore.storeEpoch += 1; // Invalidate outstanding individual operations as well
    stopElapsedTimer();

    // Mark any engines currently left in 'evaluating' as 'pending'
    moduleStore.predictions.forEach((item) => {
      if (item.status === 'evaluating') {
        item.status = 'pending';
        item.error = null;
      }
    });

    notifyListeners();
  }, []);

  // Reset all evaluations back to initial un-evaluated state
  const resetPredictions = useCallback(() => {
    if (moduleStore.isRunning) {
      cancelFleetEvaluation();
    }
    moduleStore.storeEpoch += 1; // Invalidate all prior operations before replacing the prediction Map
    moduleStore.predictions = createInitialPredictions();
    moduleStore.elapsedSeconds = 0;
    notifyListeners();
  }, [cancelFleetEvaluation]);

  // Native CSV export helper (Zero third-party dependencies)
  const exportToCsv = useCallback((customFilename?: string): boolean => {
    const evaluatedItems: FleetPredictionItem[] = [];
    moduleStore.predictions.forEach((item) => {
      if (item.status === 'success' || item.status === 'error') {
        evaluatedItems.push(item);
      }
    });

    if (evaluatedItems.length === 0) {
      return false; // Gracefully handle empty export
    }

    // Sort by Engine ID ascending for deterministic output
    evaluatedItems.sort((a, b) => a.engineId - b.engineId);

    const headers = [
      'Engine Unit ID',
      'Total Observed Cycles',
      'Terminal Window Start Cycle',
      'Terminal Window End Cycle',
      'Predicted RUL (Cycles)',
      'Evaluation Status',
      'Evaluation Timestamp (Client Local)',
      'Error Details',
    ];

    const rows: string[] = [headers.map(escapeCsv).join(',')];

    evaluatedItems.forEach((item) => {
      const row = [
        item.engineId,
        item.totalCycles,
        item.windowStartCycle,
        item.windowEndCycle,
        item.predictedRul !== null ? item.predictedRul : '',
        item.status,
        item.evaluatedAt || '',
        item.error || '',
      ];
      rows.push(row.map(escapeCsv).join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filename =
      customFilename ||
      `turboguard_fleet_predictions_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }, []);

  // Native JSON export helper (Zero third-party dependencies)
  const exportToJson = useCallback((customFilename?: string): boolean => {
    const evaluatedItems: FleetPredictionItem[] = [];
    moduleStore.predictions.forEach((item) => {
      if (item.status === 'success' || item.status === 'error') {
        evaluatedItems.push(item);
      }
    });

    if (evaluatedItems.length === 0) {
      return false;
    }

    evaluatedItems.sort((a, b) => a.engineId - b.engineId);

    const exportPayload = {
      project: 'TURBOGUARD AI — Predictive Maintenance',
      dataset: 'NASA C-MAPSS FD001 Test Fleet',
      modelArchitecture: 'Stacked LSTM Network (64 units / 32 units / 16 dense / 1 output)',
      modelArtifact: 'models/stacked_lstm_fd001.keras',
      totalBenchmarkEngines: TOTAL_BENCHMARK_ENGINES,
      evaluatedEnginesCount: evaluatedItems.length,
      exportTimestampClientLocal: new Date().toISOString(),
      disclaimer:
        'Dimensionless simulation cycles from NASA C-MAPSS FD001 run-to-failure benchmark. Not for operational flight dispatch.',
      predictions: evaluatedItems,
    };

    const jsonContent = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filename =
      customFilename ||
      `turboguard_fleet_predictions_${new Date().toISOString().slice(0, 10)}.json`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }, []);

  const predictions = useMemo(() => {
    return new Map(moduleStore.predictions);
  }, [tick]);

  const predictionList = useMemo(() => {
    return Array.from(moduleStore.predictions.values()).sort((a, b) => a.engineId - b.engineId);
  }, [tick]);

  return {
    predictions,
    predictionList,
    progress,
    summary,
    histogramBins,
    isEvaluatingFleet: moduleStore.isRunning,
    evaluateFleet,
    cancelFleetEvaluation,
    evaluateEngine,
    retryEngine,
    resetPredictions,
    exportToCsv,
    exportToJson,
  };
}
