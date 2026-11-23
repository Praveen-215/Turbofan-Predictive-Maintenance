import React, { memo, useMemo } from 'react';
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
import { BarChart3, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { RulHistogramBin } from '../../types/prediction';

export interface PredictionDistributionChartProps {
  /** Descriptive predicted-RUL frequency histogram bins from useFleetPredictions hook */
  histogramBins: RulHistogramBin[];
  /** Optional callback triggered when an operator clicks a histogram bar */
  onSelectBin?: (bin: RulHistogramBin) => void;
  /** Currently selected range label for highlight */
  selectedRange?: string | null;
  /** Optional container class name */
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: RulHistogramBin & { displayLabel: string } }>;
}

const CustomHistogramTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const sampleIds = data.engineIds.slice(0, 8);
    const hasMore = data.engineIds.length > 8;

    return (
      <div className="bg-navy-950/95 border border-cyan-800/60 p-3 rounded-lg shadow-xl text-xs space-y-2 backdrop-blur-md max-w-xs font-mono">
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
          <span className="font-semibold text-white">Range: {data.displayLabel}</span>
          <span className="text-cyan-400 font-bold">{data.count} Units ({data.percentage}%)</span>
        </div>
        <p className="text-[11px] text-slate-400 font-sans leading-normal">
          Unclipped Stacked LSTM model output cycles for terminal 30-cycle observation window.
        </p>
        {data.engineIds.length > 0 && (
          <div className="pt-1 border-t border-border-subtle">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Engine Units ({data.engineIds.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              {sampleIds.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-border-subtle text-[10px] text-cyan-300"
                >
                  #{id.toString().padStart(3, '0')}
                </span>
              ))}
              {hasMore && (
                <span className="text-[10px] text-slate-500 self-center">
                  +{data.engineIds.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

/**
 * PredictionDistributionChart
 * Renders the frequency distribution of predicted Remaining Useful Life (RUL) across
 * the 100 test turbofans using 7 descriptive cycle intervals without prescriptive risk tiers.
 */
export const PredictionDistributionChart: React.FC<PredictionDistributionChartProps> = memo(({
  histogramBins,
  onSelectBin,
  selectedRange = null,
  className = '',
}) => {
  // Map raw bin ranges to clean descriptive labels while preserving exact cycle numbers
  const chartData = useMemo(() => {
    return histogramBins.map((bin) => {
      let displayLabel = bin.range;
      if (bin.range === '< 0') {
        displayLabel = 'Below 0';
      } else if (bin.range === '> 125') {
        displayLabel = 'Above 125';
      }

      return {
        ...bin,
        displayLabel,
      };
    });
  }, [histogramBins]);

  const totalEvaluated = useMemo(() => {
    return histogramBins.reduce((acc, b) => acc + b.count, 0);
  }, [histogramBins]);

  return (
    <Card className={`flex flex-col h-full p-4 sm:p-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-border-subtle mb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Predicted RUL Frequency Distribution</span>
            </h3>
            <p className="text-xs text-slate-400">
              Descriptive cycle intervals for successfully evaluated test units
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-cyan-400 bg-navy-950 px-2.5 py-1 rounded border border-border-subtle">
            N = {totalEvaluated} / 100 Evaluated
          </span>
        </div>
      </div>

      {/* Main Chart Body */}
      {totalEvaluated === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <EmptyState
            title="No Predictions Evaluated Yet"
            description="Execute fleet inference or individual engine evaluations to populate the Remaining Useful Life frequency distribution across the 100 test engines."
            icon={<BarChart3 className="w-10 h-10 stroke-[1.5] text-slate-600" />}
          />
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="displayLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                label={{
                  value: 'Predicted Remaining Useful Life (Dataset Cycles)',
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
              <Tooltip
                content={<CustomHistogramTooltip />}
                cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
              />
              <Bar
                dataKey="count"
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
                onClick={(entry) => {
                  if (onSelectBin && entry) {
                    onSelectBin(entry);
                  }
                }}
                className={onSelectBin ? 'cursor-pointer' : undefined}
              >
                {chartData.map((entry) => {
                  const isSelected = selectedRange === entry.range || selectedRange === entry.displayLabel;
                  return (
                    <Cell
                      key={`cell-${entry.range}`}
                      fill={isSelected ? '#38bdf8' : '#06b6d4'}
                      stroke={isSelected ? '#0284c7' : 'none'}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer Info Notice */}
      <div className="mt-2 pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1.5">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Objective cycle intervals. Preserves negative and extended model outputs without clipping.</span>
        </div>
        <span className="font-mono text-cyan-400 text-[10px] self-end sm:self-auto">
          Unclipped Continuous Regression
        </span>
      </div>
    </Card>
  );
});

PredictionDistributionChart.displayName = 'PredictionDistributionChart';
