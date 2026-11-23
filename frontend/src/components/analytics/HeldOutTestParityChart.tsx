import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Crosshair, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { TestParityResponse, TestParityRecord } from '../../types/analytics';

export interface HeldOutTestParityChartProps {
  testParity: TestParityResponse;
  className?: string;
  onSelectEngine?: (record: TestParityRecord) => void;
  selectedEngineId?: number | null;
}

interface CustomScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TestParityRecord & { x: number; y: number };
  }>;
}

const CustomScatterTooltip: React.FC<CustomScatterTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isOver = data.residual >= 0;

    return (
      <div className="bg-navy-950/95 border border-cyan-800/60 p-3 rounded-lg shadow-xl text-xs space-y-2 backdrop-blur-md font-mono max-w-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
          <span className="font-semibold text-white">Engine #{data.engine_id.toString().padStart(3, '0')}</span>
          <Badge variant={isOver ? 'amber' : 'cyan'}>
            {isOver ? 'Over-Predicted' : 'Under-Predicted'}
          </Badge>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Actual RUL (Ground Truth):</span>
            <span className="text-white font-semibold">{data.actual_rul.toFixed(2)} cycles</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Predicted RUL:</span>
            <span className="text-cyan-400 font-semibold">{data.predicted_rul.toFixed(4)} cycles</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border-subtle/50">
            <span className="text-slate-400">Residual (d = ŷ - y):</span>
            <span className={`font-bold ${isOver ? 'text-amber-400' : 'text-cyan-300'}`}>
              {data.residual >= 0 ? `+${data.residual.toFixed(4)}` : data.residual.toFixed(4)} cycles
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const HeldOutTestParityChart: React.FC<HeldOutTestParityChartProps> = ({
  testParity,
  className = '',
  onSelectEngine,
  selectedEngineId = null,
}) => {
  const { records, summary } = testParity;

  // Format data points for ScatterChart
  const scatterData = useMemo(() => {
    return records.map((r) => ({
      ...r,
      x: r.actual_rul,
      y: r.predicted_rul,
    }));
  }, [records]);

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Held-Out Test Set: Actual vs. Predicted RUL Parity</span>
              <Badge variant="cyan">N = 100 Blind Test Engines</Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Terminal 30-cycle observation window evaluated against withheld ground truth (RUL_FD001.txt)
            </p>
          </div>
        </div>

        {/* Compact Summary Metrics from API */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-navy-950 px-2.5 py-1 rounded border border-border-subtle text-slate-300">
            <span>Test RMSE: <strong className="text-cyan-400">{summary.test_rmse.toFixed(4)}</strong> cycles</span>
          </div>
          <div className="bg-navy-950 px-2.5 py-1 rounded border border-border-subtle text-slate-300">
            <span>NASA Total: <strong className="text-amber-400">{summary.test_nasa_total.toFixed(2)}</strong></span>
          </div>
          <div className="bg-navy-950 px-2.5 py-1 rounded border border-border-subtle text-slate-300">
            <span>NASA / Engine: <strong className="text-emerald-400">{summary.test_nasa_per_engine.toFixed(4)}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Scatter Plot */}
      <div className="w-full min-h-[350px]">
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 15, right: 25, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Actual RUL"
              stroke="#64748b"
              fontSize={11}
              domain={[0, 145]}
              ticks={[0, 20, 40, 60, 80, 100, 120, 140]}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={{
                value: 'Actual Remaining Useful Life (Flight Cycles)',
                position: 'insideBottom',
                offset: -12,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Predicted RUL"
              stroke="#64748b"
              fontSize={11}
              domain={[0, 145]}
              ticks={[0, 20, 40, 60, 80, 100, 120, 140]}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={{
                value: 'Predicted Remaining Useful Life (Flight Cycles)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 11,
                offset: 15,
              }}
            />
            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />

            {/* Ideal Parity Reference Line (y = x) */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 140, y: 140 }]}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.8}
              label={{
                value: 'Ideal Parity (y = x)',
                position: 'insideTopLeft',
                fill: '#f43f5e',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Scatter Points for 100 Engines */}
            <Scatter
              name="Held-Out Test Engines"
              data={scatterData}
              fill="#10b981"
              stroke="#0f766e"
              strokeWidth={1}
              onClick={(point) => {
                if (onSelectEngine && point) {
                  onSelectEngine(point as unknown as TestParityRecord);
                }
              }}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: TestParityRecord };
                const isSelected = selectedEngineId === payload.engine_id;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#38bdf8' : '#10b981'}
                    stroke={isSelected ? '#ffffff' : '#047857'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-all hover:scale-125 cursor-pointer"
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Narrative & Scientific Boundaries Notice */}
      <div className="bg-navy-950 p-3 rounded border border-border-subtle text-xs text-slate-400 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Evaluation Protocol & Partition Clarification</span>
        </div>
        <p className="text-[11px] leading-normal">
          This chart plots all 100 blind test engines evaluated on their final 30 chronological telemetry cycles.
          These are offline benchmark predictions on simulated turbofan degradation data, not live telemetry.
        </p>
        <p className="text-[10px] text-slate-500 italic">
          Protocol boundary: A lower test NASA score per engine (3.0449) than validation (3.2655) does not prove superior domain generalization; validation evaluates 3,490 overlapping windows during arbitrary degradation stages, whereas this test protocol evaluates exactly 100 terminal windows.
        </p>
      </div>
    </Card>
  );
};
