import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { History, Award, AlertCircle, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { TrainingHistory } from '../../types/analytics';

export interface TrainingHistoryChartsProps {
  trainingHistory: TrainingHistory;
  className?: string;
}

type ChartMetric = 'loss' | 'rmse';

interface CustomEpochTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: number;
}

const CustomEpochTooltip: React.FC<CustomEpochTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isBest = label === 5;
    const isStopped = label === 12;

    return (
      <div className="bg-navy-950/95 border border-cyan-800/60 p-3 rounded-lg shadow-xl text-xs space-y-2 backdrop-blur-md font-mono max-w-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
          <span className="font-semibold text-white">Epoch {label} / 12</span>
          {isBest && (
            <Badge variant="emerald" dot>Best Checkpoint</Badge>
          )}
          {isStopped && (
            <Badge variant="rose" dot>Early Stopped</Badge>
          )}
        </div>
        <div className="space-y-1 text-[11px]">
          {payload.map((item) => (
            <div key={item.dataKey} className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
              </span>
              <span className="text-white font-semibold">
                {item.value.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
        {isBest && (
          <p className="text-[10px] text-emerald-400 pt-1 border-t border-border-subtle/50 font-sans">
            Optimal model weights restored from this epoch.
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const TrainingHistoryCharts: React.FC<TrainingHistoryChartsProps> = ({
  trainingHistory,
  className = '',
}) => {
  const [metricTab, setMetricTab] = useState<ChartMetric>('rmse');

  const {
    epochs,
    best_epoch,
    best_val_loss,
    best_val_rmse,
    early_stopping_epoch,
    early_stopping_patience,
  } = trainingHistory;

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Stacked LSTM Training Convergence Log</span>
              <Badge variant="cyan">All 12 Epochs</Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Loss function: Mean Squared Error (MSE) | Optimizer: Adam (lr = 0.001) | Batch: 64
            </p>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center bg-navy-950 p-1 rounded-lg border border-border-subtle self-start sm:self-auto text-xs">
          <button
            onClick={() => setMetricTab('rmse')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              metricTab === 'rmse'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RMSE (Cycles)
          </button>
          <button
            onClick={() => setMetricTab('loss')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              metricTab === 'loss'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Loss (MSE)
          </button>
        </div>
      </div>

      {/* Checkpoint Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Optimal Checkpoint:</span>
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            Epoch {best_epoch} (Loss: {best_val_loss.toFixed(2)}, RMSE: {best_val_rmse.toFixed(4)})
          </span>
        </div>
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Early Stopping:</span>
          </span>
          <span className="font-mono text-slate-300">
            Epoch {early_stopping_epoch} (Patience: {early_stopping_patience})
          </span>
        </div>
        <div className="bg-navy-950 p-2.5 rounded border border-border-subtle flex items-center justify-between">
          <span className="text-slate-400">Restored Weights:</span>
          <Badge variant="emerald" dot>Epoch {best_epoch} Weights Active</Badge>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={epochs}
            margin={{ top: 15, right: 20, left: 5, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="epoch"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              domain={[1, 12]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              label={{
                value: 'Training Epoch (1 to 12)',
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
              label={{
                value: metricTab === 'rmse' ? 'RMSE (Operational Cycles)' : 'Loss (MSE)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 11,
                offset: 5,
              }}
            />
            <Tooltip content={<CustomEpochTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />

            {/* Reference Line for Best Epoch 5 */}
            <ReferenceLine
              x={best_epoch}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Epoch ${best_epoch} (Optimal Checkpoint)`,
                position: 'top',
                fill: '#10b981',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Reference Line for Early Stopping Epoch 12 */}
            <ReferenceLine
              x={early_stopping_epoch}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Early Stopping',
                position: 'insideBottomRight',
                fill: '#f43f5e',
                fontSize: 10,
              }}
            />

            {metricTab === 'rmse' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="train_rmse"
                  name="Training RMSE"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#64748b' }}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="val_rmse"
                  name="Validation RMSE"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="train_loss"
                  name="Training Loss (MSE)"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#64748b' }}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="val_loss"
                  name="Validation Loss (MSE)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analytical Overfitting Explanation */}
      <div className="bg-navy-950 p-3.5 rounded border border-border-subtle text-xs text-slate-300 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Convergence & Overfitting Dynamics</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          Training loss decreases monotonically from 6,221.60 (Epoch 1) to 110.03 (Epoch 12).
          Validation loss achieves its minimum at <strong>Epoch 5 (181.63, RMSE: {best_val_rmse.toFixed(4)} cycles)</strong>, after which validation loss begins drifting upward (198.21 at Epoch 6, 213.56 at Epoch 12).
          The early stopping callback halts training at Epoch 12 after exhausting 7 patience iterations, and restores optimal model weights from Epoch 5.
        </p>
        <p className="text-[10px] text-slate-500 italic">
          Note: This curve documents empirical training convergence on the NASA C-MAPSS FD001 validation split. It does not establish operational real-world aircraft reliability.
        </p>
      </div>
    </Card>
  );
};
