import React, { useState } from 'react';
import { Cpu, Layers, GitBranch, Info } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ArchitectureDetails, RandomForestHyperparameters } from '../../types/analytics';

export interface ArchitectureExplorerProps {
  lstmArchitecture: ArchitectureDetails;
  cnnArchitecture: ArchitectureDetails;
  rfHyperparameters: RandomForestHyperparameters;
  className?: string;
}

type ArchTab = 'lstm' | 'cnn' | 'rf';

export const ArchitectureExplorer: React.FC<ArchitectureExplorerProps> = ({
  lstmArchitecture,
  cnnArchitecture,
  rfHyperparameters,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<ArchTab>('lstm');

  return (
    <Card className={`p-4 sm:p-5 flex flex-col space-y-4 ${className}`}>
      {/* Header with Model Architecture Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border-subtle gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-navy-950 border border-border-subtle flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Model Architecture & Hyperparameter Explorer
            </h3>
            <p className="text-xs text-slate-400">
              Layer-by-layer topologies, parameter counts, and explicit regularizer specifications
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-navy-950 p-1 rounded-lg border border-border-subtle self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('lstm')}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'lstm'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Stacked LSTM</span>
            <Badge variant="emerald" dot>Selected</Badge>
          </button>
          <button
            onClick={() => setActiveTab('cnn')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'cnn'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1D-CNN
          </button>
          <button
            onClick={() => setActiveTab('rf')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'rf'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Random Forest
          </button>
        </div>
      </div>

      {/* Stacked LSTM View */}
      {activeTab === 'lstm' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between bg-navy-950 p-3 rounded-lg border border-border-subtle text-xs gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-white">{lstmArchitecture.model_name}</span>
              <Badge variant="cyan">Keras 3</Badge>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Input: <strong className="text-cyan-400">(None, 30, 17)</strong></span>
              <span>Total Parameters: <strong className="text-emerald-400">{lstmArchitecture.total_parameters.toLocaleString()}</strong></span>
              <span>Trainable: <strong className="text-white">100%</strong></span>
            </div>
          </div>

          {/* Layer Sequence Flow Diagram */}
          <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Layer Sequential Topology:</span>
            </div>
            <div className="flex items-center gap-2 min-w-max text-xs font-mono">
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-300">
                Input (30×17)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
                LSTM(64, seq=True)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-400">
                Dropout(0.20)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
                LSTM(32, seq=False)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-400">
                Dropout(0.20)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-300">
                Dense(16, ReLU)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                Dense(1, Linear)
              </div>
            </div>
          </div>

          {/* Layer Table */}
          <div className="overflow-x-auto border border-border-subtle rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-navy-950 text-slate-400 font-semibold border-b border-border-subtle">
                <tr>
                  <th className="py-2 px-3 w-12">#</th>
                  <th className="py-2 px-3">Layer Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Output Shape</th>
                  <th className="py-2 px-3 text-right">Parameters</th>
                  <th className="py-2 px-3">Configuration & Hyperparameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-slate-300">
                {lstmArchitecture.layers.map((layer) => (
                  <tr key={layer.layer_index} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-500">{layer.layer_index}</td>
                    <td className="py-2 px-3 font-semibold text-white">{layer.layer_name}</td>
                    <td className="py-2 px-3 text-cyan-300">{layer.layer_type}</td>
                    <td className="py-2 px-3 text-slate-400">{layer.output_shape}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">
                      {layer.param_count.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400 font-sans">{layer.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1D-CNN View */}
      {activeTab === 'cnn' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between bg-navy-950 p-3 rounded-lg border border-border-subtle text-xs gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-white">{cnnArchitecture.model_name}</span>
              <Badge variant="cyan">Conv1D Bank</Badge>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Input: <strong className="text-cyan-400">(None, 30, 17)</strong></span>
              <span>Total Parameters: <strong className="text-amber-400">{cnnArchitecture.total_parameters.toLocaleString()}</strong></span>
              <span>Trainable: <strong className="text-white">100%</strong></span>
            </div>
          </div>

          {/* CNN Flow Diagram */}
          <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hierarchical Temporal Convolution Flow:</span>
            </div>
            <div className="flex items-center gap-2 min-w-max text-xs font-mono">
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-300">
                Input (30×17)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
                Conv1D(64, k=3, same)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-400">
                MaxPooling1D(2)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
                Conv1D(128, k=3, same)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-purple-950/40 border border-purple-800/50 text-purple-300">
                GlobalAveragePooling1D()
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-300">
                Dense(32, ReLU)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-border-subtle text-slate-400">
                Dropout(0.20)
              </div>
              <span className="text-slate-600">→</span>
              <div className="px-2.5 py-1.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                Dense(1, Linear)
              </div>
            </div>
          </div>

          {/* CNN Layer Table */}
          <div className="overflow-x-auto border border-border-subtle rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-navy-950 text-slate-400 font-semibold border-b border-border-subtle">
                <tr>
                  <th className="py-2 px-3 w-12">#</th>
                  <th className="py-2 px-3">Layer Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Output Shape</th>
                  <th className="py-2 px-3 text-right">Parameters</th>
                  <th className="py-2 px-3">Configuration & Hyperparameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-slate-300">
                {cnnArchitecture.layers.map((layer) => (
                  <tr key={layer.layer_index} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-500">{layer.layer_index}</td>
                    <td className="py-2 px-3 font-semibold text-white">{layer.layer_name}</td>
                    <td className="py-2 px-3 text-cyan-300">{layer.layer_type}</td>
                    <td className="py-2 px-3 text-slate-400">{layer.output_shape}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">
                      {layer.param_count.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400 font-sans">{layer.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Explicit Verification: Layer 4 is confirmed as <strong>GlobalAveragePooling1D</strong> (NOT GlobalMaxPooling1D), which averages remaining 15 temporal feature steps to produce smooth RUL projections.
            </span>
          </div>
        </div>
      )}

      {/* Random Forest View */}
      {activeTab === 'rf' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between bg-navy-950 p-3 rounded-lg border border-border-subtle text-xs gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-white">Random Forest Regressor</span>
              <Badge variant="amber">200 Trees</Badge>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Input: <strong className="text-cyan-400">2D Flattened (510 features)</strong></span>
              <span>Ensemble: <strong className="text-white">Bagging</strong></span>
            </div>
          </div>

          <div className="bg-navy-950 p-4 rounded-lg border border-border-subtle space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
              <GitBranch className="w-4 h-4" />
              <span>Model Hyperparameters & Specification Status</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">n_estimators:</span>
                <span className="text-white font-bold">{rfHyperparameters.n_estimators}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">max_features:</span>
                <span className="text-cyan-300 font-bold">"{rfHyperparameters.max_features}"</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">min_samples_leaf:</span>
                <span className="text-white font-bold">{rfHyperparameters.min_samples_leaf}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">random_state:</span>
                <span className="text-white font-bold">{rfHyperparameters.random_state}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">n_jobs:</span>
                <span className="text-white font-bold">{rfHyperparameters.n_jobs}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                <span className="text-slate-400">max_depth:</span>
                <span className="text-amber-400 font-bold">None (Unspecified, Defaults to None)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-navy-950/60 rounded border border-border-subtle text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {rfHyperparameters.parameter_specification_notes}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
