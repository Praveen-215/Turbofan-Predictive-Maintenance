import React, { memo } from 'react';
import { Database, Clock, Layers } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { EngineSummaryResponse } from '../../types/fleet';
import { formatNumber } from '../../lib/utils';

export interface EngineOverviewBannerProps {
  summary: EngineSummaryResponse | null;
  loading?: boolean;
  className?: string;
}

export const EngineOverviewBanner: React.FC<EngineOverviewBannerProps> = memo(({
  summary,
  loading = false,
  className = '',
}) => {
  if (loading && !summary) {
    return (
      <Card className={`animate-pulse p-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-800 rounded" />
            <div className="h-3 w-64 bg-slate-850 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-28 bg-slate-850 rounded" />
            <div className="h-12 w-28 bg-slate-850 rounded" />
            <div className="h-12 w-28 bg-slate-850 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Unit Identity & Dataset Metadata */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold font-mono tracking-tight text-white">
              Turbofan Unit #{summary.engine_id.toString().padStart(3, '0')}
            </h2>
            <Badge variant="cyan" dot>
              Observation Available
            </Badge>
            {summary.has_sufficient_history ? (
              <Badge variant="emerald" dot>
                Observation Window Ready (≥30 cycles)
              </Badge>
            ) : (
              <Badge variant="amber" dot>
                Insufficient Cycles (&lt;30)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Dataset Monitoring Designation: NASA C-MAPSS FD001 Test Fleet • Unit {summary.engine_id}</span>
          </p>
        </div>

        {/* Available Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          {/* Recorded Cycles */}
          <div className="bg-navy-950 px-3 py-2 rounded border border-border-subtle">
            <span className="text-slate-500 block text-[10px] tracking-wider uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Records Available
            </span>
            <span className="text-white font-bold text-sm">
              {formatNumber(summary.total_cycles)} cycles
            </span>
          </div>

          {/* Cycle Range */}
          <div className="bg-navy-950 px-3 py-2 rounded border border-border-subtle">
            <span className="text-slate-500 block text-[10px] tracking-wider uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Cycle Range
            </span>
            <span className="text-cyan-400 font-bold text-sm">
              {summary.first_cycle} – {summary.last_cycle}
            </span>
          </div>

          {/* Latest Recorded Cycle */}
          <div className="bg-navy-950 px-3 py-2 rounded border border-border-subtle col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[10px] tracking-wider uppercase">
              Latest Observed Cycle
            </span>
            <span className="text-slate-200 font-bold text-sm">
              Cycle {summary.last_cycle}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

EngineOverviewBanner.displayName = 'EngineOverviewBanner';
