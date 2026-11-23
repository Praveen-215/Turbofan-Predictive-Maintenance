import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { AnalyticsOverviewResponse, TestParityResponse } from '../types/analytics';
import { ApiError } from '../types/api';

export interface UseModelAnalyticsResult {
  overview: AnalyticsOverviewResponse | null;
  testParity: TestParityResponse | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useModelAnalytics(): UseModelAnalyticsResult {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [testParity, setTestParity] = useState<TestParityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Guard against state updates if unmounted
  const isMountedRef = useRef<boolean>(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Concurrently fetch overview and 100-engine test parity
      const [overviewData, testParityData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getAnalyticsTestParity(),
      ]);

      if (isMountedRef.current) {
        setOverview(overviewData);
        setTestParity(testParityData);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err as ApiError);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAnalytics();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAnalytics]);

  return {
    overview,
    testParity,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
