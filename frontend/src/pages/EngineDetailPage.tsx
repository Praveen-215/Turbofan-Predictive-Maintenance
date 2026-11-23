import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gauge, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { EngineSummaryResponse } from '../types/fleet';
import { ApiError } from '../types/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { formatNumber } from '../lib/utils';

export const EngineDetailPage: React.FC = () => {
  const { engineId } = useParams<{ engineId: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<EngineSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!engineId) return;
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const id = parseInt(engineId, 10);
        if (isNaN(id)) {
          throw { status: 400, message: `Invalid engine ID: ${engineId}`, isOffline: false };
        }
        const data = await api.getEngineSummary(id);
        setSummary(data);
      } catch (err: unknown) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [engineId]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/')}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Back to Fleet Overview
        </Button>
        {summary && (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/engines?id=${summary.engine_id}`)}
              icon={<Gauge className="w-3.5 h-3.5" />}
              className="text-xs font-mono font-semibold"
            >
              Launch Telemetry Visualizer
            </Button>
            <Badge variant="cyan" dot>
              Engine Unit #{summary.engine_id.toString().padStart(3, '0')}
            </Badge>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <ErrorAlert
          title={`Engine ${engineId} Error`}
          message={error.message}
          isOffline={error.isOffline}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Loading state */}
      {loading && !summary && (
        <div className="py-20">
          <LoadingSpinner label={`Querying Engine #${engineId} telemetry from backend...`} size="lg" />
        </div>
      )}

      {/* Content view */}
      {summary && (
        <>
          {/* Header Card */}
          <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-navy-850 border border-border-subtle flex items-center justify-center text-cyan-400">
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white font-mono">
                    Turbofan Engine #{summary.engine_id.toString().padStart(3, '0')}
                  </h2>
                  <Badge variant="emerald" dot>
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Monitored under NASA C-MAPSS FD001 benchmark protocol
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-navy-950 px-3 py-2 rounded border border-border-subtle">
                <span className="text-slate-500 block text-[10px]">RECORDED CYCLES</span>
                <span className="text-white font-bold">{formatNumber(summary.total_cycles)}</span>
              </div>
              <div className="bg-navy-950 px-3 py-2 rounded border border-border-subtle">
                <span className="text-slate-500 block text-[10px]">CYCLE RANGE</span>
                <span className="text-cyan-400 font-bold">{summary.first_cycle} – {summary.last_cycle}</span>
              </div>
            </div>
          </Card>

          {/* Readiness and Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Inference Readiness
                </h4>
              </div>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>30-Cycle Input Sequence:</span>
                  {summary.has_sufficient_history ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Prediction
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Insufficient History
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Sequence Window Available:</span>
                  <span className="font-mono text-white">
                    Cycles {summary.last_cycle - 29} to {summary.last_cycle}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Latest Sensor Snapshot (Cycle {summary.last_cycle})
                </h4>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                17 calibrated telemetry sensor and operational setting channels recorded.
              </p>
              <div className="max-h-36 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                  {Object.entries(summary.latest_sensor_readings).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-0.5 border-b border-slate-800/40">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-200 font-medium">{val.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Phase 3B Active Telemetry Visualizer Card */}
          <Card className="bg-navy-900/90 border border-cyan-500/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Engine Telemetry Visualizer & Historical Replay
                </h4>
                <Badge variant="cyan" dot>
                  Phase 3B Active
                </Badge>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Explore chronological 17-channel telemetry signals, adjust dataset cycle ranges, step through historical degradation replay, and evaluate Stacked LSTM Remaining Useful Life on Unit #{summary.engine_id}.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/engines?id=${summary.engine_id}`)}
              icon={<Gauge className="w-4 h-4" />}
              className="font-mono text-xs font-semibold shrink-0"
            >
              Open in Telemetry Visualizer
            </Button>
          </Card>
        </>
      )}
    </div>
  );
};
