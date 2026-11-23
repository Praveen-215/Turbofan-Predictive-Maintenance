import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SlidersHorizontal, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { TestParityRecord } from '../../types/analytics';

export interface ResidualAnalysisSectionProps {
  records: TestParityRecord[];
  className?: string;
  onSelectEngine?: (record: TestParityRecord) => void;
}

interface ResidualBin {
  range: string;
  label: string;
  count: number;
  percentage: string;
  type: 'under' | 'near' | 'over';
}

export const ResidualAnalysisSection: React.FC<ResidualAnalysisSectionProps> = ({
  records,
  className = '',
  onSelectEngine,
}) => {
  // Compute summary statistics across all 100 records
  const stats = useMemo(() => {
    if (!records.length) {
      return {
        meanResidual: 0,
        mae: 0,
        overCount: 0,
        underCount: 0,
        exactCount: 0,
        sortedByAbsResidual: [],
      };
    }

    let sumRes = 0;
    let sumAbsRes = 0;
    let over = 0;
    let under = 0;
    let exact = 0;

    records.forEach((r) => {
      sumRes += r.residual;
      sumAbsRes += Math.abs(r.residual);
      if (r.residual > 0) over++;
      else if (r.residual < 0) under++;
      else exact++;
    });

    const sortedByAbsResidual = [...records].sort(
      (a, b) => Math.abs(b.residual) - Math.abs(a.residual)
    );

    return {
      meanResidual: sumRes / records.length,
      mae: sumAbsRes / records.length,
      overCount: over,
      underCount: under,
      exactCount: exact,
      sortedByAbsResidual,
    };
  }, [records]);

  // Compute 6-bin histogram of residuals (d = predicted - actual)
  const histogramData = useMemo(() => {
    const bins: ResidualBin[] = [
      { range: '< -20', label: '< -20 cycles', count: 0, percentage: '0', type: 'under' },
      { range: '-20 to -10', label: '[-20, -10)', count: 0, percentage: '0', type: 'under' },
      { range: '-10 to 0', label: '[-10, 0)', count: 0, percentage: '0', type: 'near' },
      { range: '0 to +10', label: '[0, +10)', count: 0, percentage: '0', type: 'near' },
      { range: '+10 to +20', label: '[+10, +20)', count: 0, percentage: '0', type: 'over' },
      { range: '>= +20', label: '≥ +20 cycles', count: 0, percentage: '0', type: 'over' },
    ];

    records.forEach((r) => {
      const d = r.residual;
      if (d < -20) bins[0].count++;
      else if (d >= -20 && d < -10) bins[1].count++;
      else if (d >= -10 && d < 0) bins[2].count++;
      else if (d >= 0 && d < 10) bins[3].count++;
      else if (d >= 10 && d < 20) bins[4].count++;
      else bins[5].count++;
    });

    const total = records.length || 1;
    bins.forEach((b) => {
      b.percentage = ((b.count / total) * 100).toFixed(1);
    });

    return bins;
  }, [records]);

  // Top 5 largest absolute residual outliers
  const topOutliers = stats.sortedByAbsResidual.slice(0, 5);

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Held-Out Test Residual Distribution & Outlier Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Residual metric: d = predicted RUL − actual RUL (N = 100 test turbofans)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Mean Residual:</span>
          <span className={`px-2 py-0.5 rounded border border-border-subtle ${stats.meanResidual >= 0 ? 'text-amber-400 bg-amber-950/20' : 'text-cyan-400 bg-cyan-950/20'}`}>
            {stats.meanResidual >= 0 ? `+${stats.meanResidual.toFixed(4)}` : stats.meanResidual.toFixed(4)} cycles
          </span>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Over-Predictions (d ≥ 0)</div>
          <div className="text-base font-bold text-amber-400 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>{stats.overCount} Engines</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Later failure estimate</div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Under-Predictions (d &lt; 0)</div>
          <div className="text-base font-bold text-cyan-400 flex items-center gap-1">
            <ArrowDownRight className="w-4 h-4" />
            <span>{stats.underCount} Engines</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Earlier failure estimate</div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Mean Absolute Error (MAE)</div>
          <div className="text-base font-bold text-white">
            {stats.mae.toFixed(2)} cycles
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Average absolute drift</div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Evaluated Units</div>
          <div className="text-base font-bold text-emerald-400">
            {records.length} / 100
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-sans">100% complete dataset</div>
        </div>
      </div>

      {/* Chart and Top Outliers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        {/* Left: Residual Frequency Histogram (2 Cols) */}
        <div className="lg:col-span-2 w-full min-h-[260px]">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>Residual Error Frequency Bins (Cycles)</span>
            <span className="text-[10px] text-slate-500 font-mono">Binned into 6 continuous bands</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogramData} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="range"
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
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ResidualBin;
                    return (
                      <div className="bg-navy-950/95 border border-cyan-800/60 p-2.5 rounded text-xs font-mono text-white">
                        <div className="font-semibold text-cyan-400">{data.label}</div>
                        <div className="text-slate-300 mt-1">{data.count} Engines ({data.percentage}%)</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {histogramData.map((entry) => {
                  let fillColor = '#06b6d4'; // near zero
                  if (entry.range.includes('< -20') || entry.range.includes('-20 to -10')) {
                    fillColor = '#38bdf8'; // under-prediction
                  } else if (entry.range.includes('+10') || entry.range.includes('>= +20')) {
                    fillColor = '#f59e0b'; // over-prediction
                  }
                  return <Cell key={`bin-${entry.range}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Table of Largest Absolute Residuals (1 Col) */}
        <div className="flex flex-col space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Largest Absolute Residuals</span>
            <span className="text-[10px] text-slate-500 font-mono">Top 5 Outliers</span>
          </div>

          <div className="overflow-x-auto border border-border-subtle rounded-lg flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-navy-950 text-slate-400 border-b border-border-subtle text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">Engine</th>
                  <th className="py-2 px-2 text-right">Actual</th>
                  <th className="py-2 px-2 text-right">Pred</th>
                  <th className="py-2 px-2.5 text-right">Residual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-slate-300 text-[11px]">
                {topOutliers.map((record) => {
                  const isOver = record.residual >= 0;
                  return (
                    <tr
                      key={record.engine_id}
                      onClick={() => onSelectEngine && onSelectEngine(record)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-1.5 px-2.5 font-bold text-white">
                        #{record.engine_id.toString().padStart(3, '0')}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400">
                        {record.actual_rul.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-cyan-400">
                        {record.predicted_rul.toFixed(1)}
                      </td>
                      <td className={`py-1.5 px-2.5 text-right font-bold ${isOver ? 'text-amber-400' : 'text-cyan-300'}`}>
                        {record.residual >= 0 ? `+${record.residual.toFixed(1)}` : record.residual.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Objective Safety Notice */}
      <div className="pt-2 border-t border-border-subtle flex items-center gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Residual sign convention: positive residual indicates model predicted later failure than actual; negative residual indicates earlier failure. Neither direction is labeled as universally safe or dangerous in this benchmark analysis.
        </span>
      </div>
    </Card>
  );
};
