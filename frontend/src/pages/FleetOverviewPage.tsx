import React from 'react';
import { Header } from '../components/layout/Header';
import { FleetMetricsGrid } from '../components/dashboard/FleetMetricsGrid';
import { CycleDistributionChart } from '../components/dashboard/CycleDistributionChart';
import { FleetInventoryTable } from '../components/dashboard/FleetInventoryTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { useFleetOverview } from '../hooks/useFleetOverview';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const FleetOverviewPage: React.FC = () => {
  const { status, health, checkHealth } = useHealthCheck();
  const { fleet, engines, loading, error, refetch } = useFleetOverview();

  const handleRefresh = async () => {
    await Promise.all([checkHealth(), refetch()]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Fleet Overview"
        subtitle="NASA C-MAPSS FD001 Turbofan Health & Fleet Management Center"
        status={status}
        modelName={health?.model_name}
        onRefresh={handleRefresh}
        isRefreshing={loading}
      />

      <div className="p-6 space-y-6 flex-1">
        {/* Error / Offline Alert */}
        {error && (
          <ErrorAlert
            message={error.message}
            onRetry={handleRefresh}
            isOffline={error.isOffline}
          />
        )}

        {/* Loading State */}
        {loading && !fleet && (
          <div className="py-20">
            <LoadingSpinner label="Ingesting and synchronizing fleet telemetry from backend..." size="lg" />
          </div>
        )}

        {/* Content View */}
        {fleet && (
          <>
            {/* Top Metrics Row */}
            <FleetMetricsGrid fleet={fleet} />

            {/* Middle Row: Cycle Distribution Chart */}
            <div className="grid grid-cols-1 gap-6">
              <CycleDistributionChart perEngineCycles={fleet.per_engine_cycles} />
            </div>

            {/* Bottom Row: Fleet Inventory Table */}
            <div className="space-y-3">
              <FleetInventoryTable engines={engines} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
