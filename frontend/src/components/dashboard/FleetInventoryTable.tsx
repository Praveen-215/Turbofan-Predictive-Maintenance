import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { EngineInventoryItem } from '../../types/fleet';
import { formatNumber } from '../../lib/utils';

interface FleetInventoryTableProps {
  engines: EngineInventoryItem[];
}

type SortField = 'engineId' | 'totalCycles';
type SortOrder = 'asc' | 'desc';

export const FleetInventoryTable: React.FC<FleetInventoryTableProps> = ({ engines }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('engineId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'not_ready'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredEngines = useMemo(() => {
    return engines.filter((item) => {
      // Search filter
      const matchesSearch =
        searchTerm.trim() === '' ||
        item.engineId.toString().includes(searchTerm.trim()) ||
        `engine ${item.engineId}`.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ready' && item.isPredictionReady) ||
        (statusFilter === 'not_ready' && !item.isPredictionReady);

      return matchesSearch && matchesStatus;
    });
  }, [engines, searchTerm, statusFilter]);

  const sortedEngines = useMemo(() => {
    return [...filteredEngines].sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'engineId') {
        return (a.engineId - b.engineId) * modifier;
      }
      return (a.totalCycles - b.totalCycles) * modifier;
    });
  }, [filteredEngines, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedEngines.length / pageSize));
  const paginatedEngines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEngines.slice(start, start + pageSize);
  }, [sortedEngines, currentPage, pageSize]);

  return (
    <Card className="p-0 overflow-hidden">
      {/* Table Header / Toolbar */}
      <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-navy-950/40">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white tracking-tight">Fleet Engine Inventory</h3>
          <span className="text-xs text-slate-400 font-mono">
            ({filteredEngines.length} of {engines.length} engines)
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Engine ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-border-subtle rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | 'ready' | 'not_ready');
              setCurrentPage(1);
            }}
            aria-label="Filter by prediction readiness status"
            className="text-xs py-1.5 px-2.5 bg-slate-900 border border-border-subtle rounded-md text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Prediction Ready (≥ 30 cycles)</option>
            <option value="not_ready">Insufficient History</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-navy-950 text-slate-400 font-mono text-[11px] uppercase border-b border-border-subtle">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('engineId')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Engine ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('totalCycles')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Recorded Cycles</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4">LSTM Window (30 Cycles)</th>
              <th className="py-3 px-4">Operational Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-normal">
            {paginatedEngines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No turbofan engines match your filter criteria.
                </td>
              </tr>
            ) : (
              paginatedEngines.map((engine) => (
                <tr
                  key={engine.engineId}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/engines/${engine.engineId}`)}
                >
                  <td className="py-3 px-4 font-mono font-medium text-white">
                    Engine #{engine.engineId.toString().padStart(3, '0')}
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-300">
                    {formatNumber(engine.totalCycles)} cycles
                  </td>
                  <td className="py-3 px-4">
                    {engine.isPredictionReady ? (
                      <Badge variant="emerald" dot>
                        Valid Window (30×17)
                      </Badge>
                    ) : (
                      <Badge variant="amber" dot>
                        &lt; 30 Cycles
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300 font-medium">Monitored</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/engines/${engine.engineId}`);
                      }}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="group-hover:text-cyan-400 group-hover:bg-cyan-950/40"
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-slate-400 bg-navy-950/40">
        <div>
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, sortedEngines.length)} of {sortedEngines.length} engines
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Prev
          </Button>
          <span className="px-2 font-mono text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            icon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
};
