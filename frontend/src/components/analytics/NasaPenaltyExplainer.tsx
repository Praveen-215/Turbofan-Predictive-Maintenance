import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Calculator, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { NasaScoringInfo } from '../../types/analytics';

export interface NasaPenaltyExplainerProps {
  nasaScoring: NasaScoringInfo;
  className?: string;
}

export const NasaPenaltyExplainer: React.FC<NasaPenaltyExplainerProps> = ({
  nasaScoring,
  className = '',
}) => {
  // Generate curve data points for d in [-30, +30]
  const curveData = useMemo(() => {
    const points = [];
    for (let d = -30; d <= 30; d += 2) {
      let penalty = 0;
      if (d < 0) {
        penalty = Math.exp(-d / 13) - 1;
      } else {
        penalty = Math.exp(d / 10) - 1;
      }
      points.push({
        error: d,
        penalty,
        isOver: d >= 0,
      });
    }
    return points;
  }, []);

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>NASA Asymmetric Scoring Function Formulation</span>
              <Badge variant="amber">Exponential Penalty</Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Benchmark scoring formulation from the NASA Prognostics Center of Excellence
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400 bg-navy-950 px-2.5 py-1 rounded border border-border-subtle">
          S = Σ s_i
        </div>
      </div>

      {/* Mathematical Formulation Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Left: Equation Box */}
        <div className="bg-navy-950 p-3.5 rounded-lg border border-border-subtle space-y-2.5 font-mono">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider">Formal Mathematical Definition:</div>
          <div className="text-slate-300">
            d = <strong className="text-white">predicted_RUL</strong> − <strong className="text-white">actual_RUL</strong>
          </div>
          <div className="space-y-1.5 pt-1 border-t border-border-subtle/60 text-[11px]">
            <div className="flex items-center justify-between text-cyan-400">
              <span>If d &lt; 0 (Under-Prediction):</span>
              <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-300 font-bold">
                s = exp(−d / 13) − 1
              </code>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span>If d ≥ 0 (Over-Prediction):</span>
              <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-bold">
                s = exp(d / 10) − 1
              </code>
            </div>
          </div>
        </div>

        {/* Right: Asymmetry Comparison Example */}
        <div className="bg-navy-950 p-3.5 rounded-lg border border-border-subtle space-y-2 text-xs">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider font-mono">Asymmetry Dynamics at |d| = 10 & 30 Cycles:</div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between py-0.5 border-b border-border-subtle/40">
              <span className="text-slate-400">At |d| = 10 cycles:</span>
              <span className="text-slate-300">
                Under: <strong className="text-cyan-400">1.16 pts</strong> vs. Over: <strong className="text-amber-400">1.72 pts</strong> (+48%)
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5 border-b border-border-subtle/40">
              <span className="text-slate-400">At |d| = 20 cycles:</span>
              <span className="text-slate-300">
                Under: <strong className="text-cyan-400">3.66 pts</strong> vs. Over: <strong className="text-amber-400">6.39 pts</strong> (+75%)
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400">At |d| = 30 cycles:</span>
              <span className="text-slate-300">
                Under: <strong className="text-cyan-400">9.05 pts</strong> vs. Over: <strong className="text-amber-400">19.09 pts</strong> (+111%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Asymmetric Curve Chart */}
      <div className="w-full min-h-[260px]">
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>Exponential Penalty Curve: Error Magnitude (d) vs. Penalty Score (s)</span>
          <span className="text-[10px] text-slate-500 font-mono">Range: −30 to +30 cycles</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="error"
              stroke="#64748b"
              fontSize={11}
              domain={[-30, 30]}
              ticks={[-30, -20, -10, 0, 10, 20, 30]}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              label={{
                value: 'Prediction Error: d = predicted RUL − actual RUL (Cycles)',
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
              domain={[0, 22]}
              label={{
                value: 'Penalty Score s_i (Exponential)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 11,
                offset: 15,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload.error;
                  const p = payload[0].payload.penalty;
                  return (
                    <div className="bg-navy-950/95 border border-cyan-800/60 p-2.5 rounded text-xs font-mono text-white">
                      <div>Error: <span className={d >= 0 ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>{d >= 0 ? `+${d}` : d} cycles</span></div>
                      <div className="text-slate-300 mt-0.5">Penalty Score: <strong className="text-emerald-400">{p.toFixed(4)}</strong> points</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {d >= 0 ? 'exp(d/10) - 1' : 'exp(-d/13) - 1'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="penalty"
              name="Asymmetric Penalty"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Explicit Asymmetry Interpretation */}
      <div className="bg-navy-950 p-3 rounded border border-border-subtle text-xs text-slate-300 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Steeper Penalty for Over-Prediction</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          {nasaScoring.asymmetry_interpretation}
        </p>
      </div>
    </Card>
  );
};
