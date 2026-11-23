import React from 'react';
import { FileText } from 'lucide-react';
import { ComingSoonPage } from './ComingSoonPage';

export const ReportsPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Fleet Maintenance & Compliance Reports"
      subtitle="Automated inspection logs, engineering work orders, and aerospace compliance reporting."
      phase="Phase 3E"
      icon={FileText}
      plannedFeatures={[
        'Automated fleet health summaries and urgent maintenance dispatch alerts',
        'Exportable CSV and JSON telemetry packages for ground crews',
        'Audit trail of model predictions, sensor anomalies, and engine lifecycle history',
        'Executive PDF report generation for fleet maintenance planning',
      ]}
    />
  );
};
