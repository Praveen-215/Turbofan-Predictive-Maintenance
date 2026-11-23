import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../services/api';
import {
  EngineSummaryResponse,
  TelemetryRecord,
  EngineReplayResponse,
} from '../types/fleet';
import { ApiError } from '../types/api';
import { SelectedFeatureName } from '../types/sensors';

export interface CycleRange {
  start: number;
  end: number;
}

export interface ObservationWindow {
  startCycle: number;
  endCycle: number;
  isValid: boolean;
  length: number;
  records: TelemetryRecord[];
}

export interface TelemetryChartPoint {
  cycle: number;
  [key: string]: number;
}

export interface CachedEngineData {
  summary: EngineSummaryResponse;
  telemetry: TelemetryRecord[];
}

export interface UseEngineTelemetryOptions {
  initialEngineId?: number;
  initialFeatures?: SelectedFeatureName[];
  playbackIntervalMs?: number;
}

export interface UseEngineTelemetryResult {
  // Engine Identification & Selection
  selectedEngineId: number;
  selectEngine: (engineId: number) => void;

  // Data States
  summary: EngineSummaryResponse | null;
  telemetry: TelemetryRecord[];
  filteredTelemetry: TelemetryRecord[];
  loading: boolean;
  summaryLoading: boolean;
  telemetryLoading: boolean;
  error: ApiError | null;

  // Feature Selection
  selectedFeatures: SelectedFeatureName[];
  setSelectedFeatures: (features: SelectedFeatureName[]) => void;
  toggleFeature: (feature: SelectedFeatureName) => void;

  // Cycle Range & Filtering
  cycleRange: CycleRange;
  setCycleRange: (range: CycleRange) => void;
  resetCycleRange: () => void;

  // 30-Cycle Observation Window & Replay
  replayEndCycle: number;
  setReplayEndCycle: (endCycle: number) => void;
  observationWindow: ObservationWindow;

  // Playback Simulation
  isPlaying: boolean;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  startPlayback: () => void;
  pausePlayback: () => void;
  togglePlayback: () => void;
  stepForward: () => void;
  stepBackward: () => void;

  // Chart Presentation (Raw vs. Normalized)
  isNormalized: boolean;
  setIsNormalized: (normalized: boolean) => void;
  toggleNormalized: () => void;
  chartData: TelemetryChartPoint[];

  // On-Demand Deep Learning LSTM Prediction
  predictedRul: number | null;
  predictionResult: EngineReplayResponse | null;
  isPredicting: boolean;
  predictionError: ApiError | null;
  evaluatePrediction: () => Promise<void>;
  clearPrediction: () => void;

  // Actions
  refreshEngineData: () => Promise<void>;
}

const DEFAULT_FEATURES: SelectedFeatureName[] = ['sensor_2', 'sensor_3', 'sensor_4'];
const DEFAULT_PLAYBACK_MS = 600;

/**
 * Validates that an engine ID is an integer within the NASA C-MAPSS FD001 test fleet (1 to 100)
 */
function isValidEngineId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 100;
}

export function useEngineTelemetry({
  initialEngineId = 1,
  initialFeatures = DEFAULT_FEATURES,
  playbackIntervalMs = DEFAULT_PLAYBACK_MS,
}: UseEngineTelemetryOptions = {}): UseEngineTelemetryResult {
  // Current active engine ID
  const [selectedEngineId, setSelectedEngineId] = useState<number>(() =>
    isValidEngineId(initialEngineId) ? initialEngineId : 1
  );

  // In-memory session cache to prevent duplicate network calls when toggling engines
  const engineCacheRef = useRef<Map<number, CachedEngineData>>(new Map());

  // Tracking ref for active engine to prevent stale async responses from overwriting state
  const activeEngineRef = useRef<number>(selectedEngineId);
  activeEngineRef.current = selectedEngineId;

  // Request generation counter to guard against overlapping requests for the same engine
  const requestGenerationRef = useRef<number>(0);

  // Prediction request generation counter
  const predictionRequestIdRef = useRef<number>(0);

  // Primary data states
  const [summary, setSummary] = useState<EngineSummaryResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Feature selection
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeatureName[]>(initialFeatures);

  // Cycle range filtering
  const [cycleRange, setCycleRangeState] = useState<CycleRange>({ start: 1, end: 31 });

  // Replay cursor state (end cycle of 30-cycle observation window)
  const [replayEndCycle, setReplayEndCycleState] = useState<number>(31);

  // Synchronous tracking ref for active replay end cycle to ensure reliable provenance checks
  const activeReplayEndCycleRef = useRef<number>(31);
  activeReplayEndCycleRef.current = replayEndCycle;

  // Normalization mode
  const [isNormalized, setIsNormalized] = useState<boolean>(false);

  // Playback timer & state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Supported playback speed setter: 0.5x, 1x, 2x, 4x
  const setPlaybackSpeed = useCallback((speed: number) => {
    if (speed === 0.5 || speed === 1 || speed === 2 || speed === 4) {
      setPlaybackSpeedState(speed);
    }
  }, []);

  // On-demand Stacked LSTM Prediction states (kept strictly separate from telemetry)
  const [predictedRul, setPredictedRul] = useState<number | null>(null);
  const [predictionResult, setPredictionResult] = useState<EngineReplayResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<ApiError | null>(null);

  // Centralized prediction invalidation helper
  const invalidatePrediction = useCallback(() => {
    predictionRequestIdRef.current += 1;
    setIsPredicting(false);
    setPredictedRul(null);
    setPredictionResult(null);
    setPredictionError(null);
  }, []);

  // Stop playback simulation helper
  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current !== null) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, []);

  // Engine selection handler with validation
  const selectEngine = useCallback(
    (newEngineId: number) => {
      if (!isValidEngineId(newEngineId)) {
        setError({
          status: 400,
          message: `Invalid Engine ID: ${newEngineId}. Engine ID must be an integer between 1 and 100.`,
          isOffline: false,
        });
        return;
      }

      if (newEngineId === activeEngineRef.current) return;

      stopPlayback();
      invalidatePrediction();

      // Synchronously invalidate in-flight telemetry and prediction requests before state update
      activeEngineRef.current = newEngineId;
      requestGenerationRef.current += 1;

      setSelectedEngineId(newEngineId);
    },
    [stopPlayback, invalidatePrediction]
  );

  // Fetch summary and complete telemetry with in-memory caching and stale-request guard
  const loadEngineData = useCallback(
    async (engineId: number, bypassCache = false) => {
      if (!isValidEngineId(engineId)) {
        setError({
          status: 400,
          message: `Invalid Engine ID: ${engineId}. Valid range is 1 to 100.`,
          isOffline: false,
        });
        return;
      }

      // Check session cache first
      if (!bypassCache && engineCacheRef.current.has(engineId)) {
        const cached = engineCacheRef.current.get(engineId)!;
        setSummary(cached.summary);
        setTelemetry(cached.telemetry);
        setCycleRangeState({ start: cached.summary.first_cycle, end: cached.summary.last_cycle });
        activeReplayEndCycleRef.current = cached.summary.last_cycle;
        setReplayEndCycleState(cached.summary.last_cycle);
        setError(null);
        return;
      }

      // Generation counter to ensure older overlapping requests cannot overwrite newer ones
      const currentRequestId = ++requestGenerationRef.current;

      setSummaryLoading(true);
      setTelemetryLoading(true);
      setError(null);

      try {
        // Fetch engine summary and full chronological telemetry in parallel
        const [summaryData, telemetryData] = await Promise.all([
          api.getEngineSummary(engineId),
          api.getEngineTelemetry(engineId),
        ]);

        // Guard against stale response if user switched engines or issued a newer request
        if (
          activeEngineRef.current !== engineId ||
          requestGenerationRef.current !== currentRequestId
        ) {
          return;
        }

        // Sort telemetry strictly chronologically by cycle (preserves monotonicity)
        const sortedTelemetry = [...telemetryData.telemetry].sort((a, b) => a.cycle - b.cycle);

        // Store in session cache
        engineCacheRef.current.set(engineId, {
          summary: summaryData,
          telemetry: sortedTelemetry,
        });

        setSummary(summaryData);
        setTelemetry(sortedTelemetry);
        setCycleRangeState({ start: summaryData.first_cycle, end: summaryData.last_cycle });
        activeReplayEndCycleRef.current = summaryData.last_cycle;
        setReplayEndCycleState(summaryData.last_cycle);
      } catch (err: unknown) {
        if (
          activeEngineRef.current !== engineId ||
          requestGenerationRef.current !== currentRequestId
        ) {
          return;
        }
        setSummary(null);
        setTelemetry([]);
        setError(err as ApiError);
      } finally {
        if (
          activeEngineRef.current === engineId &&
          requestGenerationRef.current === currentRequestId
        ) {
          setSummaryLoading(false);
          setTelemetryLoading(false);
        }
      }
    },
    []
  );

  // Trigger data fetch when selectedEngineId changes
  useEffect(() => {
    loadEngineData(selectedEngineId);
  }, [selectedEngineId, loadEngineData]);

  // Refresh current engine bypassing cache
  const refreshEngineData = useCallback(async () => {
    stopPlayback();
    invalidatePrediction();
    await loadEngineData(selectedEngineId, true);
  }, [selectedEngineId, loadEngineData, stopPlayback, invalidatePrediction]);

  // Feature toggle helper
  const toggleFeature = useCallback((feature: SelectedFeatureName) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(feature)) {
        // Prevent deselecting all features (keep at least one)
        if (prev.length <= 1) return prev;
        return prev.filter((f) => f !== feature);
      }
      return [...prev, feature];
    });
  }, []);

  // Safe cycle range setter with boundary enforcement
  const setCycleRange = useCallback(
    (newRange: CycleRange) => {
      if (!summary) return;
      const minCycle = summary.first_cycle;
      const maxCycle = summary.last_cycle;

      const safeStart = Math.max(minCycle, Math.min(newRange.start, maxCycle));
      const safeEnd = Math.max(safeStart, Math.min(newRange.end, maxCycle));

      setCycleRangeState({ start: safeStart, end: safeEnd });
    },
    [summary]
  );

  // Reset range to full available flight cycles
  const resetCycleRange = useCallback(() => {
    if (!summary) return;
    setCycleRangeState({ start: summary.first_cycle, end: summary.last_cycle });
  }, [summary]);

  // Safe replay end-cycle setter with 30-cycle floor enforcement
  const setReplayEndCycle = useCallback(
    (endCycle: number) => {
      if (!summary) return;
      const minEndCycle = Math.min(summary.first_cycle + 29, summary.last_cycle);
      const maxEndCycle = summary.last_cycle;

      const clampedEnd = Math.max(minEndCycle, Math.min(endCycle, maxEndCycle));
      if (clampedEnd !== activeReplayEndCycleRef.current) {
        invalidatePrediction();
        activeReplayEndCycleRef.current = clampedEnd;
        setReplayEndCycleState(clampedEnd);
      }
    },
    [summary, invalidatePrediction]
  );

  // Step replay 1 cycle forward
  const stepForward = useCallback(() => {
    if (!summary) return;
    const current = activeReplayEndCycleRef.current;
    if (current < summary.last_cycle) {
      invalidatePrediction();
      const next = current + 1;
      activeReplayEndCycleRef.current = next;
      setReplayEndCycleState(next);
    }
  }, [summary, invalidatePrediction]);

  // Step replay 1 cycle backward
  const stepBackward = useCallback(() => {
    if (!summary) return;
    const minEndCycle = Math.min(summary.first_cycle + 29, summary.last_cycle);
    const current = activeReplayEndCycleRef.current;
    if (current > minEndCycle) {
      invalidatePrediction();
      const prev = current - 1;
      activeReplayEndCycleRef.current = prev;
      setReplayEndCycleState(prev);
    }
  }, [summary, invalidatePrediction]);

  // Playback simulation controls
  const startPlayback = useCallback(() => {
    if (!summary) return;
    const current = activeReplayEndCycleRef.current;
    if (current >= summary.last_cycle) {
      // Loop or restart from earliest valid 30-cycle window
      const restartCycle = summary.first_cycle + 29;
      if (restartCycle !== current) {
        invalidatePrediction();
        activeReplayEndCycleRef.current = restartCycle;
        setReplayEndCycleState(restartCycle);
      }
    }
    setIsPlaying(true);
  }, [summary, invalidatePrediction]);

  const pausePlayback = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, pausePlayback, startPlayback]);

  // Playback loop effect with dynamic interval support
  useEffect(() => {
    if (!isPlaying || !summary) return;

    const effectiveIntervalMs = Math.round(playbackIntervalMs / playbackSpeed);

    playbackTimerRef.current = setInterval(() => {
      const current = activeReplayEndCycleRef.current;
      if (current >= summary.last_cycle) {
        stopPlayback();
      } else {
        invalidatePrediction();
        const next = current + 1;
        activeReplayEndCycleRef.current = next;
        setReplayEndCycleState(next);
      }
    }, effectiveIntervalMs);

    return () => {
      if (playbackTimerRef.current !== null) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isPlaying, summary, playbackIntervalMs, playbackSpeed, stopPlayback, invalidatePrediction]);

  // Memoized 30-cycle observation window calculation
  const observationWindow: ObservationWindow = useMemo(() => {
    const startCycle = replayEndCycle - 29;
    const endCycle = replayEndCycle;
    const isValid = startCycle >= 1 && replayEndCycle >= 30;

    const windowRecords = isValid
      ? telemetry.filter((r) => r.cycle >= startCycle && r.cycle <= endCycle)
      : [];

    return {
      startCycle,
      endCycle,
      isValid,
      length: windowRecords.length,
      records: windowRecords,
    };
  }, [telemetry, replayEndCycle]);

  // Memoized filtered telemetry for current cycle range
  const filteredTelemetry = useMemo(() => {
    return telemetry.filter(
      (r) => r.cycle >= cycleRange.start && r.cycle <= cycleRange.end
    );
  }, [telemetry, cycleRange]);

  // Memoized feature min/max for normalization calculation
  const featureExtremes = useMemo(() => {
    const extremes: Record<string, { min: number; max: number }> = {};
    if (filteredTelemetry.length === 0) return extremes;

    selectedFeatures.forEach((feat) => {
      let min = Infinity;
      let max = -Infinity;
      filteredTelemetry.forEach((r) => {
        const val = r.sensors[feat];
        if (typeof val === 'number') {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
      extremes[feat] = {
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 1 : max,
      };
    });

    return extremes;
  }, [filteredTelemetry, selectedFeatures]);

  // Memoized chart data with normalization and raw value preservation
  const chartData: TelemetryChartPoint[] = useMemo(() => {
    return filteredTelemetry.map((record) => {
      const point: TelemetryChartPoint = { cycle: record.cycle };

      selectedFeatures.forEach((feat) => {
        const rawVal = record.sensors[feat] ?? 0;
        // Always embed raw value with `_raw_` prefix for tooltips regardless of mode
        point[`_raw_${feat}`] = rawVal;

        if (isNormalized) {
          const { min, max } = featureExtremes[feat] || { min: 0, max: 1 };
          const span = max - min;
          point[feat] = span > 0 ? ((rawVal - min) / span) * 100 : 50;
        } else {
          point[feat] = rawVal;
        }
      });

      return point;
    });
  }, [filteredTelemetry, selectedFeatures, isNormalized, featureExtremes]);

  // Normalization toggle helper
  const toggleNormalized = useCallback(() => {
    setIsNormalized((prev) => !prev);
  }, []);

  // Explicit on-demand deep learning LSTM prediction execution
  const evaluatePrediction = useCallback(async () => {
    if (!summary) return;

    const targetEngineId = selectedEngineId;
    const targetReplayEndCycle = activeReplayEndCycleRef.current;

    if (targetReplayEndCycle < 30) {
      setPredictionError({
        status: 400,
        message: `Observation cycle ${targetReplayEndCycle} is insufficient. Stacked LSTM requires at least 30 consecutive recorded cycles.`,
        isOffline: false,
      });
      return;
    }

    const currentPredictionId = ++predictionRequestIdRef.current;

    setIsPredicting(true);
    setPredictionError(null);

    try {
      // Calls existing backend replay endpoint with predict=true
      const result = await api.getEngineReplay(targetEngineId, targetReplayEndCycle, true);

      // Guard against stale response:
      // 1. Request ID must still match
      // 2. Engine ID must still be active
      // 3. Replay end cycle must still match evaluated window
      if (
        activeEngineRef.current !== targetEngineId ||
        predictionRequestIdRef.current !== currentPredictionId ||
        activeReplayEndCycleRef.current !== targetReplayEndCycle
      ) {
        return;
      }

      setPredictionResult(result);
      // Preserve floating-point prediction precision without artificial rounding
      setPredictedRul(result.predicted_rul ?? null);
    } catch (err: unknown) {
      if (
        activeEngineRef.current !== targetEngineId ||
        predictionRequestIdRef.current !== currentPredictionId ||
        activeReplayEndCycleRef.current !== targetReplayEndCycle
      ) {
        return;
      }
      setPredictedRul(null);
      setPredictionResult(null);
      setPredictionError(err as ApiError);
    } finally {
      if (
        activeEngineRef.current === targetEngineId &&
        predictionRequestIdRef.current === currentPredictionId &&
        activeReplayEndCycleRef.current === targetReplayEndCycle
      ) {
        setIsPredicting(false);
      }
    }
  }, [selectedEngineId, summary]);

  // Clear active prediction
  const clearPrediction = useCallback(() => {
    invalidatePrediction();
  }, [invalidatePrediction]);

  return {
    selectedEngineId,
    selectEngine,

    summary,
    telemetry,
    filteredTelemetry,
    loading: summaryLoading || telemetryLoading,
    summaryLoading,
    telemetryLoading,
    error,

    selectedFeatures,
    setSelectedFeatures,
    toggleFeature,

    cycleRange,
    setCycleRange,
    resetCycleRange,

    replayEndCycle,
    setReplayEndCycle,
    observationWindow,

    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    startPlayback,
    pausePlayback,
    togglePlayback,
    stepForward,
    stepBackward,

    isNormalized,
    setIsNormalized,
    toggleNormalized,
    chartData,

    predictedRul,
    predictionResult,
    isPredicting,
    predictionError,
    evaluatePrediction,
    clearPrediction,

    refreshEngineData,
  };
}
