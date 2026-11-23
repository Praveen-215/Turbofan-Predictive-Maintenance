import React from 'react';
import { FileCheck, Filter, XCircle, CheckCircle, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ArtifactProvenance, PreprocessingConfig } from '../../types/analytics';

export interface ArtifactProvenanceCardProps {
  artifactProvenance: ArtifactProvenance;
  preprocessing: PreprocessingConfig;
  className?: string;
}

export const ArtifactProvenanceCard: React.FC<ArtifactProvenanceCardProps> = ({
  artifactProvenance,
  preprocessing,
  className = '',
}) => {
  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Trained Model Artifacts & Preprocessing Provenance</span>
              <Badge variant="emerald" dot>{artifactProvenance.verification_status}</Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Filesystem metadata verification and deterministic sensor preprocessing specifications
            </p>
          </div>
        </div>
      </div>

      {/* Artifacts Table */}
      <div className="overflow-x-auto border border-border-subtle rounded-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-navy-950 text-slate-400 font-semibold border-b border-border-subtle">
            <tr>
              <th className="py-2.5 px-3">Artifact Component</th>
              <th className="py-2.5 px-3">Filename</th>
              <th className="py-2.5 px-3 text-right">Size on Disk</th>
              <th className="py-2.5 px-3 text-right">Expected Size</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle text-slate-300">
            {artifactProvenance.artifacts.map((art) => {
              const isMatch = art.exists_on_disk && art.size_bytes === art.expected_size_bytes;
              return (
                <tr key={art.filename} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-semibold text-white font-sans">{art.name}</td>
                  <td className="py-2 px-3 text-cyan-300">{art.filename}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-200">
                    {art.size_bytes.toLocaleString()} B
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {art.expected_size_bytes.toLocaleString()} B
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isMatch ? (
                      <Badge variant="emerald" dot>Exact Match</Badge>
                    ) : (
                      <Badge variant="rose">Mismatch</Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-400 font-sans">{art.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preprocessing and Feature Selection Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
        {/* 17 Active Features */}
        <div className="bg-navy-950 p-3.5 rounded-lg border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5 font-sans">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>17 Active Scaled Features</span>
            </span>
            <Badge variant="cyan">StandardScaler</Badge>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal font-sans">
            Fitted strictly on 80 training engines with zero data leakage to validation or test splits.
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {preprocessing.feature_names.map((feat) => (
              <span
                key={feat}
                className="px-1.5 py-0.5 rounded bg-slate-900 border border-border-subtle text-[11px] font-mono text-cyan-300"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Dropped and Retained Features */}
        <div className="bg-navy-950 p-3.5 rounded-lg border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5 font-sans">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Dimensionality Reduction (24 → 17 Features)</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-300 font-sans flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>7 Dropped Zero-Variance Features:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {preprocessing.dropped_zero_variance_features.map((feat) => (
                <span
                  key={feat}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-rose-950 text-[10px] font-mono text-rose-300 line-through"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle/50 space-y-1">
            <div className="text-[11px] text-slate-300 font-sans flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>1 Near-Constant Retained Sensor:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-800 text-[10px] font-mono text-cyan-300">
                sensor_6 (HPC outlet pressure)
              </span>
              <span className="text-[10px] text-slate-500 font-sans">98.1% constant at 21.61 psia, retained after sensitivity check</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Artifacts are verified against current filesystem state. These artifacts define the reproducible foundation for the TURBOGUARD AI inference engine.
        </span>
      </div>
    </Card>
  );
};
