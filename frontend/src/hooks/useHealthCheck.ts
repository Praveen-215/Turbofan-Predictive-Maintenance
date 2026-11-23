import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { HealthResponse } from '../types/prediction';
import { ApiError } from '../types/api';

export type ConnectionStatus = 'checking' | 'healthy' | 'unhealthy' | 'offline';

export interface UseHealthCheckResult {
  status: ConnectionStatus;
  health: HealthResponse | null;
  error: ApiError | null;
  checkHealth: () => Promise<void>;
}

export function useHealthCheck(): UseHealthCheckResult {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    try {
      const data = await api.getHealth();
      setHealth(data);
      setStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
      setError(null);
    } catch (err: unknown) {
      setHealth(null);
      const apiErr = err as ApiError;
      setError(apiErr);
      setStatus(apiErr.isOffline ? 'offline' : 'unhealthy');
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { status, health, error, checkHealth };
}
