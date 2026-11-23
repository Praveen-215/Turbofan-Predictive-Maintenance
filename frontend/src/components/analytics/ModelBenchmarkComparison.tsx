import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { BarChart2, Info, CheckCircle2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ModelComparisonSection } from '../../types/analytics';

export interface ModelBenchmarkComparisonProps {
  modelComparison: ModelComparisonSection;
  className?: string;
}

type MetricView = 'val_rmse' | 'nasa_sample' | 'nasa_total';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    payload: {
      model_name: string;
      train_rmse: number;
      val_rmse: number;
      val_nasa: number;
      val_nasa_per_sample: number;
      is_selected: boolean;
    };
  }>;
}

const CustomBenchmarkTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-navy-950/95 border border-cyan-800/60 p-3 rounded-lg shadow-xl text-xs space-y-2 backdrop-blur-md font-mono max-w-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
          <span className="font-semibold text-white">{data.model_name}</span>
          {data.is_selected && (
            <Badge variant="emerald" dot>Selected</Badge>
          )}
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Val RMSE:</span>
            <span className="text-cyan-400 font-semibold">{data.val_rmse.toFixed(4)} cycles</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Train RMSE:</span>
            <span className="text-slate-300">{data.train_rmse.toFixed(4)} cycles</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Val NASA Total:</span>
            <span className="text-amber-400">{data.val_nasa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">NASA / Sample:</span>
            <span className="text-purple-400 font-semibold">{data.val_nasa_per_sample.toFixed(4)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ModelBenchmarkComparison: React.FC<ModelBenchmarkComparisonProps> = ({
  modelComparison,
  className = '',
}) => {
  const [metricView, setMetricView] = useState<MetricView>('val_rmse');

  const { benchmark_models, selected_model_name, selection_rationale } = modelComparison;

  // Chart data formatting
  const chartData = benchmark_models.map((m) => ({
    ...m,
    displayName: m.model_name.replace(' Network', ''),
  }));

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-5 ${className}`}>
      {/* Header and Metric View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Five-Model Architectural Benchmark Study
            </h3>
            <p className="text-xs text-slate-400">
              Controlled evaluation across 3,490 validation sequences from 20 hold-out training engines
            </p>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center bg-navy-950 p-1 rounded-lg border border-border-subtle self-start sm:self-auto text-xs">
          <button
            onClick={() => setMetricView('val_rmse')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              metricView === 'val_rmse'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Validation RMSE
          </button>
          <button
            onClick={() => setMetricView('nasa_sample')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              metricView === 'nasa_sample'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NASA / Sample
          </button>
          <button
            onClick={() => setMetricView('nasa_total')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              metricView === 'nasa_total'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Total NASA Score
          </button>
        </div>
      </div>

      {/* Main Recharts Visualization */}
      <div className="w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          {metricView === 'val_rmse' ? (
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="displayName"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                label={{
                  value: 'RMSE (Operational Cycles, Lower is Better)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                  offset: 15,
                }}
              />
              <Tooltip content={<CustomBenchmarkTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar
                dataKey="val_rmse"
                name="Validation RMSE (Cycles)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.model_name}`}
                    fill={entry.is_selected ? '#06b6d4' : entry.model_name === 'Stacked GRU' ? '#38bdf8' : '#64748b'}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="train_rmse"
                name="Training RMSE (Cycles)"
                fill="#334155"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          ) : metricView === 'nasa_sample' ? (
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="displayName"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                label={{
                  value: 'NASA Score / Sample (Lower is Better)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                  offset: 15,
                }}
              />
              <Tooltip content={<CustomBenchmarkTooltip />} />
              <Bar
                dataKey="val_nasa_per_sample"
                name="NASA Score / Sample"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-nasa-${entry.model_name}`}
                    fill={entry.is_selected ? '#10b981' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="displayName"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                label={{
                  value: 'Total NASA Penalty Score',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                  offset: 10,
                }}
              />
              <Tooltip content={<CustomBenchmarkTooltip />} />
              <Bar
                dataKey="val_nasa"
                name="Total Validation NASA Score"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-total-${entry.model_name}`}
                    fill={entry.is_selected ? '#10b981' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Model Selection Policy Box */}
      <div className="bg-navy-950 p-4 rounded-lg border border-border-subtle text-xs space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Model Selection Policy: {selected_model_name}</span>
          <Badge variant="emerald" dot>Selected</Badge>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          {selection_rationale}
        </p>
        <div className="pt-2 border-t border-border-subtle/50 flex flex-wrap gap-4 text-[11px] text-slate-400">
          <span>
            Primary Criterion: <strong className="text-white">Lowest Validation NASA Asymmetric Score</strong> (11,396.72 / 3.2655 per sample)
          </span>
          <span>
            Secondary Criterion: <strong className="text-white">Validation RMSE</strong> (13.4770 cycles)
          </span>
          <span className="text-slate-500">
            Note: Neither architecture is labeled as universally safer or operationally superior.
          </span>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="overflow-x-auto border border-border-subtle rounded-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-navy-950 text-slate-400 font-semibold border-b border-border-subtle">
            <tr>
              <th className="py-2.5 px-3">Architecture</th>
              <th className="py-2.5 px-3">Input Format</th>
              <th className="py-2.5 px-3">Parameters</th>
              <th className="py-2.5 px-3 text-right">Train RMSE</th>
              <th className="py-2.5 px-3 text-right">Val RMSE</th>
              <th className="py-2.5 px-3 text-right">Gap (Δ)</th>
              <th className="py-2.5 px-3 text-right">Val NASA Total</th>
              <th className="py-2.5 px-3 text-right">NASA / Sample</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-slate-300">
            {benchmark_models.map((model) => {
              const gap = model.val_rmse - model.train_rmse;
              return (
                <tr
                  key={model.model_name}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    model.is_selected ? 'bg-cyan-950/20 font-semibold text-white' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span>{model.model_name}</span>
                      {model.is_selected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400">{model.input_representation}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {model.parameter_count ? model.parameter_count.toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{model.train_rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-bold">{model.val_rmse.toFixed(4)}</td>
                  <td className={`py-2.5 px-3 text-right ${gap > 5 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">{model.val_nasa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{model.val_nasa_per_sample.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {model.is_selected ? (
                      <Badge variant="emerald" dot>Selected</Badge>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Benchmark</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Notice */}
      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Metrics represent controlled academic benchmarks on validation partition (N=3,490 sequences). They do not measure operational risk in flight dispatch.
        </span>
      </div>
    </Card>
  );
};
