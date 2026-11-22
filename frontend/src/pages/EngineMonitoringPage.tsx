import React from 'react';
import { Gauge } from 'lucide-react';
import { ComingSoonPage } from './ComingSoonPage';

export const EngineMonitoringPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Engine Monitoring Module"
      subtitle="Comprehensive multi-sensor telemetry visualizer and real-time degradation monitor."
      phase="Phase 3B"
      icon={Gauge}
      plannedFeatures={[
        'Interactive 17-sensor time-series charts with zoom and pan',
        'Physical degradation tracking for combustor, turbine, and compressor subsystems',
        'Rolling operational setting normalization and variance tracking',
        'Custom cycle range inspection (Cycles 1 to N)',
      ]}
    />
  );
};
