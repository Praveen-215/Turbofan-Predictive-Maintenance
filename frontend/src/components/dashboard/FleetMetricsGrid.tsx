import React from 'react';
import { Gauge, Database, Cpu, Activity } from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { FleetOverviewResponse } from '../../types/fleet';
import { formatNumber } from '../../lib/utils';

interface FleetMetricsGridProps {
  fleet: FleetOverviewResponse;
}

export const FleetMetricsGrid: React.FC<FleetMetricsGridProps> = ({ fleet }) => {
  const cycleValues = Object.values(fleet.per_engine_cycles);
  const minCycles = cycleValues.length ? Math.min(...cycleValues) : 0;
  const maxCycles = cycleValues.length ? Math.max(...cycleValues) : 0;
  const avgCycles = cycleValues.length
    ? Math.round(cycleValues.reduce((acc, c) => acc + c, 0) / cycleValues.length)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Monitored Fleet"
        value={formatNumber(fleet.total_engines)}
        subtext="NASA C-MAPSS FD001 Turbofan Units"
        icon={<Gauge className="w-5 h-5" />}
      />

      <MetricCard
        label="Telemetry Records"
        value={formatNumber(fleet.total_telemetry_records)}
        subtext={`17 sensor & setting channels (${fleet.features.length} selected)`}
        icon={<Database className="w-5 h-5" />}
      />

      <MetricCard
        label="Prediction-Ready Fleet"
        value={`${fleet.prediction_ready_count} / ${fleet.total_engines}`}
        subtext="Engines with ≥ 30 recorded cycles"
        icon={<Cpu className="w-5 h-5" />}
      />

      <MetricCard
        label="Flight Cycle Range"
        value={`${minCycles} – ${maxCycles}`}
        subtext={`Fleet average: ${avgCycles} cycles`}
        icon={<Activity className="w-5 h-5" />}
      />
    </div>
  );
};
