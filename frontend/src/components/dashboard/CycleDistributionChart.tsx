import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../common/Card';
import { BarChart3 } from 'lucide-react';

interface CycleDistributionChartProps {
  perEngineCycles: Record<string, number>;
}

interface BinData {
  range: string;
  count: number;
  enginePercentage: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: BinData }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-navy-900 border border-border-subtle p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-semibold text-white">Range: {data.range}</p>
        <p className="text-cyan-400 font-mono font-medium">
          {data.count} {data.count === 1 ? 'Engine' : 'Engines'} ({data.enginePercentage})
        </p>
        <p className="text-[11px] text-slate-400">Total recorded flight cycles prior to inspection</p>
      </div>
    );
  }
  return null;
};

export const CycleDistributionChart: React.FC<CycleDistributionChartProps> = ({
  perEngineCycles,
}) => {
  const chartData: BinData[] = useMemo(() => {
    const cycles = Object.values(perEngineCycles);
    const total = cycles.length || 1;

    const bins = [
      { range: '30–50', min: 30, max: 50, count: 0 },
      { range: '51–100', min: 51, max: 100, count: 0 },
      { range: '101–150', min: 101, max: 150, count: 0 },
      { range: '151–200', min: 151, max: 200, count: 0 },
      { range: '201–250', min: 201, max: 250, count: 0 },
      { range: '251–310', min: 251, max: 310, count: 0 },
    ];

    cycles.forEach((c) => {
      const targetBin = bins.find((b) => c >= b.min && c <= b.max);
      if (targetBin) {
        targetBin.count += 1;
      }
    });

    return bins.map((b) => ({
      range: b.range,
      count: b.count,
      enginePercentage: `${((b.count / total) * 100).toFixed(1)}%`,
    }));
  }, [perEngineCycles]);

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Fleet Observation Cycle Distribution
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          N = {Object.keys(perEngineCycles).length} Units
        </span>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="range"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={{
                value: 'Recorded Flight Cycles Range',
                position: 'insideBottom',
                offset: -12,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }} />
            <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={45} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-slate-400">
        <span>Derived strictly from test_FD001.txt flight history</span>
        <span className="text-cyan-400 font-mono">Min 31 cycles • Max 303 cycles</span>
      </div>
    </Card>
  );
};
