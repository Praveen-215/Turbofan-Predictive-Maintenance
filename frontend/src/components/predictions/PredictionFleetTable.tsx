import React, { useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FleetPredictionItem, FleetPredictionStatus } from '../../types/prediction';

export interface PredictionFleetTableProps {
  /** All 100 benchmark engine prediction items from useFleetPredictions hook */
  predictions: FleetPredictionItem[];
  /** Currently selected engine ID for inspector panel highlight */
  selectedEngineId?: number | null;
  /** Callback invoked when an operator clicks to inspect an engine */
  onSelectEngine?: (engine: FleetPredictionItem) => void;
  /** Callback invoked when an operator clicks to evaluate or retry an individual engine */
  onRetryEngine?: (engineId: number) => Promise<void> | void;
  /** Whether the fleet is actively executing batch inference */
  isEvaluatingFleet?: boolean;
  /** Optional container class name */
  className?: string;
}

type SortField = 'engineId' | 'predictedRul' | 'status' | 'evaluatedAt' | 'totalCycles';
type SortOrder = 'asc' | 'desc';

/**
 * PredictionFleetTable
 * Interactive fleet predictions table featuring search, multi-column sorting,
 * status filtering, pagination, and direct links to single-engine telemetry monitoring.
 */
export const PredictionFleetTable: React.FC<PredictionFleetTableProps> = memo(({
  predictions,
  selectedEngineId = null,
  onSelectEngine,
  onRetryEngine,
  isEvaluatingFleet = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('engineId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | FleetPredictionStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered dataset
  const filteredPredictions = useMemo(() => {
    return predictions.filter((item) => {
      // Search filter by ID
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        item.engineId.toString().includes(query) ||
        `engine ${item.engineId}`.toLowerCase().includes(query) ||
        `unit #${item.engineId}`.toLowerCase().includes(query);

      // Status filter
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [predictions, searchTerm, statusFilter]);

  // Sorted dataset
  const sortedPredictions = useMemo(() => {
    return [...filteredPredictions].sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;

      if (sortField === 'engineId') {
        return (a.engineId - b.engineId) * modifier;
      }

      if (sortField === 'totalCycles') {
        return (a.totalCycles - b.totalCycles) * modifier;
      }

      if (sortField === 'predictedRul') {
        const valA = a.predictedRul ?? (sortOrder === 'asc' ? Infinity : -Infinity);
        const valB = b.predictedRul ?? (sortOrder === 'asc' ? Infinity : -Infinity);
        return (valA - valB) * modifier;
      }

      if (sortField === 'status') {
        const statusPriority: Record<FleetPredictionStatus, number> = {
          success: 1,
          evaluating: 2,
          pending: 3,
          error: 4,
        };
        return (statusPriority[a.status] - statusPriority[b.status]) * modifier;
      }

      if (sortField === 'evaluatedAt') {
        const timeA = a.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
        const timeB = b.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
        return (timeA - timeB) * modifier;
      }

      return 0;
    });
  }, [filteredPredictions, sortField, sortOrder]);

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(sortedPredictions.length / pageSize));
  const paginatedPredictions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPredictions.slice(start, start + pageSize);
  }, [sortedPredictions, currentPage, pageSize]);

  // Render status badge
  const renderStatusBadge = (status: FleetPredictionStatus) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="emerald" dot>
            Evaluated
          </Badge>
        );
      case 'evaluating':
        return (
          <Badge variant="cyan" dot>
            Evaluating...
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="rose" dot>
            Failed
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="slate" dot>
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className={`p-0 overflow-hidden flex flex-col ${className}`}>
      {/* Table Header Toolbar */}
      <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-navy-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-navy-900 border border-border-subtle flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Test Fleet Predictions Inventory
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredPredictions.length} of {predictions.length} units
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Unit ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-border-subtle rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44 font-mono"
            />
          </div>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | FleetPredictionStatus);
              setCurrentPage(1);
            }}
            aria-label="Filter predictions by evaluation status"
            className="text-xs py-1.5 px-2.5 bg-slate-900 border border-border-subtle rounded-md text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="success">Evaluated (Success)</option>
            <option value="pending">Pending</option>
            <option value="evaluating">Evaluating</option>
            <option value="error">Failed (Error)</option>
          </select>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-navy-950 text-slate-400 font-mono text-[11px] uppercase border-b border-border-subtle select-none">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('engineId')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Target Unit</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('predictedRul')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Predicted RUL</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-4 hidden md:table-cell">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>Observation Window</span>
                </div>
              </th>

              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
                onClick={() => handleSort('evaluatedAt')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Evaluated At (Local)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle font-normal">
            {paginatedPredictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  No turbofan engine predictions match the selected filter criteria.
                </td>
              </tr>
            ) : (
              paginatedPredictions.map((item) => {
                const isSelected = selectedEngineId === item.engineId;
                const formattedTime = item.evaluatedAt
                  ? new Date(item.evaluatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : null;

                return (
                  <tr
                    key={item.engineId}
                    className={`transition-colors hover:bg-slate-900/60 ${
                      isSelected ? 'bg-cyan-950/30 border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    {/* Unit ID */}
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>Unit #{item.engineId.toString().padStart(3, '0')}</span>
                        {item.totalCycles > 0 && (
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            ({item.totalCycles} cyc)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Predicted RUL */}
                    <td className="py-3 px-4 font-mono">
                      {item.status === 'success' && item.predictedRul !== null ? (
                        <div className="flex items-baseline gap-1.5" title={`Exact backend output: ${item.predictedRul.toFixed(4)} cycles`}>
                          <span className="text-white font-bold text-sm">
                            {item.predictedRul.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-semibold uppercase">
                            Cycles
                          </span>
                        </div>
                      ) : item.status === 'evaluating' ? (
                        <span className="text-cyan-400/80 animate-pulse text-xs">
                          Calculating...
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Observation Window */}
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400 text-xs">
                      {item.windowStartCycle > 0 && item.windowEndCycle > 0 ? (
                        <span className="text-slate-300">
                          Cycles {item.windowStartCycle} – {item.windowEndCycle}
                        </span>
                      ) : (
                        <span className="text-slate-600">Terminal 30 cycles</span>
                      )}
                    </td>

                    {/* Evaluated At */}
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-slate-400 text-[11px]">
                      {formattedTime ? (
                        <span title={item.evaluatedAt || ''}>{formattedTime}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Select / Inspect Action */}
                        {onSelectEngine && (
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'ghost'}
                            onClick={() => onSelectEngine(item)}
                            title="Inspect engine prediction details"
                            className="p-1.5 h-7 text-xs font-mono"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Inspect</span>
                          </Button>
                        )}

                        {/* Retry action for failed items */}
                        {item.status === 'error' && onRetryEngine && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRetryEngine(item.engineId)}
                            disabled={isEvaluatingFleet}
                            title="Retry evaluation for this engine"
                            className="p-1.5 h-7 text-xs font-mono text-amber-300 hover:text-amber-200"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Retry</span>
                          </Button>
                        )}

                        {/* Direct Monitoring Link */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/engines?id=${item.engineId}`)}
                          title={`Navigate to Engine #${item.engineId} Telemetry Monitoring`}
                          className="p-1.5 h-7 text-xs font-mono text-slate-400 hover:text-cyan-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden md:inline text-[11px]">Telemetry</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-navy-950/60 text-xs text-slate-400 font-mono">
        <div className="text-[11px]">
          Page {currentPage} of {totalPages} ({filteredPredictions.length} matching units)
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
            className="h-7 text-xs"
          >
            Previous
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            icon={<ChevronRight className="w-3.5 h-3.5" />}
            className="h-7 text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
});

PredictionFleetTable.displayName = 'PredictionFleetTable';
