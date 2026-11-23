import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  RefreshCw,
  ExternalLink,
  Sliders,
  Layers,
  Crosshair,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

import { useModelAnalytics } from '../hooks/useModelAnalytics';
import {
  AnalyticsProvenanceBanner,
  AnalyticsSummaryCards,
  ModelBenchmarkComparison,
  TrainingHistoryCharts,
  ArchitectureExplorer,
  HeldOutTestParityChart,
  ResidualAnalysisSection,
  NasaPenaltyExplainer,
  ArtifactProvenanceCard,
} from '../components/analytics';
import { TestParityRecord } from '../types/analytics';

type AnalyticsSection = 'all' | 'benchmark' | 'training' | 'parity' | 'architecture';

export const ModelAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { overview, testParity, loading, error, refetch } = useModelAnalytics();

  const [activeSection, setActiveSection] = useState<AnalyticsSection>('all');
  const [selectedRecord, setSelectedRecord] = useState<TestParityRecord | null>(null);

  const handleSelectEngine = (record: TestParityRecord) => {
    setSelectedRecord(record);
  };

  const handleNavigateToMonitoring = (engineId: number) => {
    navigate(`/engines?id=${encodeURIComponent(engineId)}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy-900 border border-border-subtle flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Model Architecture & Scientific Benchmark Analytics
                </h1>
                <Badge variant="cyan" dot>Phase 3D</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Empirical multi-model benchmark study, training convergence logs, and 100-engine held-out test evaluation
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Analytics
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !overview && (
        <div className="py-20 flex justify-center">
          <LoadingSpinner label="Loading model analytics, benchmark matrix, and held-out test parity dataset..." size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorAlert
          title="Failed to Load Model Analytics"
          message={error.message}
          isOffline={error.isOffline}
          onRetry={refetch}
        />
      )}

      {/* Main Dashboard Content when loaded */}
      {overview && testParity && (
        <div className="space-y-6">
          {/* Section Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border-subtle">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeSection === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveSection('benchmark')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === 'benchmark'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Benchmark Comparison</span>
            </button>
            <button
              onClick={() => setActiveSection('training')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === 'training'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Training History (12 Epochs)</span>
            </button>
            <button
              onClick={() => setActiveSection('parity')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === 'parity'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Test Parity & Residuals</span>
            </button>
            <button
              onClick={() => setActiveSection('architecture')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === 'architecture'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture & Provenance</span>
            </button>
          </div>

          {/* Section A: Research Provenance Banner */}
          <AnalyticsProvenanceBanner datasetProtocol={overview.dataset_protocol} />

          {/* Executive Summary Cards */}
          <AnalyticsSummaryCards overview={overview} testParity={testParity} />

          {/* Selected Engine Inspector Drawer (if user clicked a parity point or outlier) */}
          {selectedRecord && (
            <Card className="p-4 border-cyan-500/40 bg-navy-950/90 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        Inspecting Test Engine #{selectedRecord.engine_id.toString().padStart(3, '0')}
                      </span>
                      <Badge variant={selectedRecord.residual >= 0 ? 'amber' : 'cyan'}>
                        {selectedRecord.residual >= 0 ? 'Over-Predicted' : 'Under-Predicted'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
                      <span>Actual RUL: <strong className="text-white">{selectedRecord.actual_rul.toFixed(1)}</strong> cycles</span>
                      <span>•</span>
                      <span>Predicted: <strong className="text-cyan-400">{selectedRecord.predicted_rul.toFixed(4)}</strong> cycles</span>
                      <span>•</span>
                      <span>
                        Residual: <strong className={selectedRecord.residual >= 0 ? 'text-amber-400' : 'text-cyan-300'}>
                          {selectedRecord.residual >= 0 ? `+${selectedRecord.residual.toFixed(4)}` : selectedRecord.residual.toFixed(4)}
                        </strong> cycles
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleNavigateToMonitoring(selectedRecord.engine_id)}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    View Engine Monitoring
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedRecord(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Section B: Benchmark Comparison */}
          {(activeSection === 'all' || activeSection === 'benchmark') && (
            <ModelBenchmarkComparison modelComparison={overview.model_comparison} />
          )}

          {/* Section C: Training History (12 Epochs) */}
          {(activeSection === 'all' || activeSection === 'training') && (
            <TrainingHistoryCharts trainingHistory={overview.training_history} />
          )}

          {/* Section E: Held-Out Test Parity */}
          {(activeSection === 'all' || activeSection === 'parity') && (
            <HeldOutTestParityChart
              testParity={testParity}
              onSelectEngine={handleSelectEngine}
              selectedEngineId={selectedRecord?.engine_id}
            />
          )}

          {/* Section F: Residual Analysis */}
          {(activeSection === 'all' || activeSection === 'parity') && (
            <ResidualAnalysisSection
              records={testParity.records}
              onSelectEngine={handleSelectEngine}
            />
          )}

          {/* Section G: NASA Scoring Explainer */}
          {(activeSection === 'all' || activeSection === 'benchmark') && (
            <NasaPenaltyExplainer nasaScoring={overview.nasa_scoring} />
          )}

          {/* Section D: Model Architecture Explorer */}
          {(activeSection === 'all' || activeSection === 'architecture') && (
            <ArchitectureExplorer
              lstmArchitecture={overview.lstm_architecture}
              cnnArchitecture={overview.cnn_architecture}
              rfHyperparameters={overview.random_forest_hyperparameters}
            />
          )}

          {/* Section H: Artifact Provenance & Preprocessing */}
          {(activeSection === 'all' || activeSection === 'architecture') && (
            <ArtifactProvenanceCard
              artifactProvenance={overview.artifact_provenance}
              preprocessing={overview.preprocessing}
            />
          )}
        </div>
      )}
    </div>
  );
};
