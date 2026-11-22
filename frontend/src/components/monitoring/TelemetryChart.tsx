import React, { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { SensorMetadata } from '../../types/sensors';
import { TelemetryChartPoint } from '../../hooks/useEngineTelemetry';
import { Activity, Info } from 'lucide-react';

export interface TelemetryChartProps {
  data: TelemetryChartPoint[];
  selectedFeatures: SensorMetadata[];
  isNormalized?: boolean;
  loading?: boolean;
  observationWindow?: {
    startCycle: number;
    endCycle: number;
    isValid: boolean;
  };
  className?: string;
}

const LINE_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#38bdf8', // Sky
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    payload: TelemetryChartPoint;
  }>;
  label?: number | string;
  isNormalized?: boolean;
  featureMap: Record<string, SensorMetadata>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  isNormalized = false,
  featureMap,
}) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="bg-navy-900/95 border border-border-subtle p-3 rounded-lg shadow-2xl text-xs space-y-2 max-w-sm backdrop-blur-md">
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
          <span className="font-mono text-white font-semibold">
            Dataset Cycle #{label}
          </span>
          {isNormalized && (
            <span className="text-[10px] text-cyan-400 font-mono px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-800 rounded">
              Normalized View (0–100%)
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {payload.map((item) => {
            const featName = item.dataKey;
            const meta = featureMap[featName];
            const rawVal = point[`_raw_${featName}`];

            if (!meta) return null;

            const isValueFinite = typeof item.value === 'number' && Number.isFinite(item.value);
            const isRawFinite = typeof rawVal === 'number' && Number.isFinite(rawVal);

            return (
              <div key={featName} className="flex items-center justify-between gap-4 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 truncate">
                    {meta.label}
                    {meta.symbol ? ` (${meta.symbol})` : ''}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  {isNormalized ? (
                    <div>
                      <span className="text-white font-medium">
                        {isValueFinite ? `${item.value.toFixed(1)}%` : '—'}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1.5">
                        ({isRawFinite ? `${rawVal.toFixed(4)}${meta.unit ? ` ${meta.unit}` : ''}` : '—'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-white font-medium">
                      {isValueFinite
                        ? `${item.value.toFixed(4)}${meta.unit ? ` ${meta.unit}` : ''}`
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const TelemetryChart: React.FC<TelemetryChartProps> = memo(({
  data,
  selectedFeatures,
  isNormalized = false,
  loading = false,
  observationWindow,
  className = '',
}) => {
  // Build feature lookup map for tooltip & legend formatting
  const featureMap = React.useMemo(() => {
    const map: Record<string, SensorMetadata> = {};
    selectedFeatures.forEach((f) => {
      map[f.name] = f;
    });
    return map;
  }, [selectedFeatures]);

  // Check if multiple features with different engineering units are selected in raw mode
  const hasMismatchedUnits = React.useMemo(() => {
    if (selectedFeatures.length <= 1) return false;
    const firstUnit = selectedFeatures[0].unit ?? '';
    return selectedFeatures.some((f) => (f.unit ?? '') !== firstUnit);
  }, [selectedFeatures]);

  const showUnitDisparityNotice = !isNormalized && hasMismatchedUnits;

  // Loading state
  if (loading) {
    return (
      <Card className={`flex items-center justify-center min-h-[380px] ${className}`}>
        <LoadingSpinner label="Loading chronological telemetry signals from API..." size="md" />
      </Card>
    );
  }

  // Empty feature selection
  if (selectedFeatures.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <EmptyState
          title="No Sensor Features Selected"
          description="Select one or more sensor channels or operational settings above to render chronological telemetry."
          icon={<Activity className="w-8 h-8 text-slate-500" />}
        />
      </Card>
    );
  }

  // Empty data
  if (data.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <EmptyState
          title="No Telemetry Data Available"
          description="No dataset cycle observations match the current cycle range for this engine."
          icon={<Activity className="w-8 h-8 text-slate-500" />}
        />
      </Card>
    );
  }

  return (
    <Card className={`p-4 flex flex-col ${className}`}>
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
            Chronological Telemetry Signals
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            ({data.length} cycles plotted)
          </span>
        </div>

        {observationWindow?.isValid && (
          <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
            Observation Window: Cycles {observationWindow.startCycle} – {observationWindow.endCycle} (30 cycles)
          </div>
        )}
      </div>

      {/* Unit Disparity Notice (when raw mode has mixed units) */}
      {showUnitDisparityNotice && (
        <div className="mb-3 px-3 py-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Different sensor units are selected. Enable Normalized View (0–100%) for proportional comparison.
          </span>
        </div>
      )}

      {/* Recharts Container */}
      <div className="w-full h-[360px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="cycle"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={{
                value: 'Dataset Cycle',
                position: 'insideBottom',
                offset: -4,
                fill: '#64748b',
                fontSize: 10,
              }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              domain={isNormalized ? [0, 100] : ['auto', 'auto']}
              label={{
                value: isNormalized ? 'Normalized Value (%)' : 'Observed Value',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                fill: '#64748b',
                fontSize: 10,
              }}
            />

            <Tooltip
              content={
                <CustomTooltip
                  isNormalized={isNormalized}
                  featureMap={featureMap}
                />
              }
              cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            <Legend
              wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              formatter={(value: string) => {
                const meta = featureMap[value];
                if (!meta) return value;
                return (
                  <span className="text-slate-300 hover:text-white transition-colors">
                    {meta.label} {meta.symbol ? `(${meta.symbol})` : ''}
                  </span>
                );
              }}
            />

            {/* Shaded 30-Cycle LSTM Replay / Observation Window Area */}
            {observationWindow?.isValid && (
              <ReferenceArea
                x1={observationWindow.startCycle}
                x2={observationWindow.endCycle}
                fill="#06b6d4"
                fillOpacity={0.08}
                stroke="#06b6d4"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
            )}

            {/* Individual Sensor Signal Lines */}
            {selectedFeatures.map((feat, idx) => (
              <Line
                key={feat.name}
                type="monotone"
                dataKey={feat.name}
                name={feat.name}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 4, stroke: '#070a12', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

TelemetryChart.displayName = 'TelemetryChart';
