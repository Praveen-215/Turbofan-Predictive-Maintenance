import React from 'react';
import { Database, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { DatasetProtocolInfo } from '../../types/analytics';

export interface AnalyticsProvenanceBannerProps {
  datasetProtocol: DatasetProtocolInfo;
  className?: string;
}

export const AnalyticsProvenanceBanner: React.FC<AnalyticsProvenanceBannerProps> = ({
  datasetProtocol,
  className = '',
}) => {
  return (
    <Card className={`p-4 sm:p-5 border-border-subtle bg-navy-900/90 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Model Benchmark & Scientific Provenance
              </h2>
              <Badge variant="cyan" dot>
                {datasetProtocol.dataset_name}
              </Badge>
              <Badge variant="slate">
                Research Benchmark
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Systematic five-model comparative study and empirical validation on NASA C-MAPSS FD001 turbofan degradation simulations.
            </p>
          </div>
        </div>

        {/* Top-level parameter chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-navy-950 px-3 py-1.5 rounded border border-border-subtle flex items-center gap-1.5 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Window: <strong className="text-white">{datasetProtocol.window_size}</strong> cycles</span>
          </div>
          <div className="bg-navy-950 px-3 py-1.5 rounded border border-border-subtle flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Features: <strong className="text-white">{datasetProtocol.feature_count}</strong> channels</span>
          </div>
          <div className="bg-navy-950 px-3 py-1.5 rounded border border-border-subtle flex items-center gap-1.5 text-slate-300">
            <span>RUL Cap: <strong className="text-cyan-400">{datasetProtocol.max_rul_cap}</strong> cycles</span>
          </div>
        </div>
      </div>

      {/* Protocol separation details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3.5 text-xs">
        <div className="bg-navy-950/70 p-3 rounded border border-border-subtle/60 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">Validation Partition</span>
            <span className="font-mono text-slate-400">20 Engines ({datasetProtocol.validation_sequences.toLocaleString()} Windows)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            80/20 engine split on <code className="text-slate-300">train_FD001.txt</code>. Evaluated across all 3,490 overlapping 30-cycle sliding windows representing diverse wear stages.
          </p>
        </div>

        <div className="bg-navy-950/70 p-3 rounded border border-border-subtle/60 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">Held-Out Test Fleet</span>
            <span className="font-mono text-slate-400">100 Blind Engines ({datasetProtocol.blind_test_sequences} Windows)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Evaluated on <code className="text-slate-300">test_FD001.txt</code> strictly using exactly one terminal 30-cycle window per engine against official withheld <code className="text-slate-300">RUL_FD001.txt</code>.
          </p>
        </div>
      </div>

      {/* Academic Disclaimer Callout */}
      <div className="mt-3 pt-3 border-t border-border-subtle flex items-start gap-2 text-[11px] text-slate-400">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          {datasetProtocol.disclaimer}
        </span>
      </div>
    </Card>
  );
};
