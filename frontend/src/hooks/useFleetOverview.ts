import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { FleetOverviewResponse, EngineInventoryItem } from '../types/fleet';
import { ApiError } from '../types/api';

export interface UseFleetOverviewResult {
  fleet: FleetOverviewResponse | null;
  engines: EngineInventoryItem[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useFleetOverview(): UseFleetOverviewResult {
  const [fleet, setFleet] = useState<FleetOverviewResponse | null>(null);
  const [engines, setEngines] = useState<EngineInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFleetOverview();
      setFleet(data);

      // Transform into sorted inventory items
      const items: EngineInventoryItem[] = data.engine_ids.map((id) => {
        const totalCycles = data.per_engine_cycles[id.toString()] ?? data.per_engine_cycles[id] ?? 0;
        const isPredictionReady = totalCycles >= 30;
        return {
          engineId: id,
          totalCycles,
          isPredictionReady,
          status: isPredictionReady ? 'Active' : 'Insufficient History',
        };
      });

      setEngines(items);
    } catch (err: unknown) {
      setFleet(null);
      setEngines([]);
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  return { fleet, engines, loading, error, refetch: fetchFleet };
}
