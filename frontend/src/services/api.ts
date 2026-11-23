import { FleetOverviewResponse, EngineSummaryResponse, EngineTelemetryResponse, EngineReplayResponse } from '../types/fleet';
import { HealthResponse, PredictionResponse, TelemetrySequenceRequest } from '../types/prediction';
import { AnalyticsOverviewResponse, TestParityResponse } from '../types/analytics';
import { ApiError } from '../types/api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Non-JSON response body
    }
    const err: ApiError = {
      status: response.status,
      message: errorDetail,
      isOffline: false,
    };
    throw err;
  }
  return response.json() as Promise<T>;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await handleResponse<T>(response);
  } catch (err: unknown) {
    // If it's already an ApiError, re-throw
    if (typeof err === 'object' && err !== null && 'status' in err) {
      throw err;
    }
    // Network failure (server down, CORS blocked, unreachable)
    const offlineError: ApiError = {
      status: 0,
      message: `Unable to connect to TURBOGUARD AI backend at ${BASE_URL}. Ensure the FastAPI server is running.`,
      isOffline: true,
    };
    throw offlineError;
  }
}

export const api = {
  getBaseUrl(): string {
    return BASE_URL;
  },

  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  async getFleetOverview(): Promise<FleetOverviewResponse> {
    return request<FleetOverviewResponse>('/fleet');
  },

  async getEngineSummary(engineId: number): Promise<EngineSummaryResponse> {
    return request<EngineSummaryResponse>(`/fleet/${engineId}`);
  },

  async getEngineTelemetry(
    engineId: number,
    startCycle?: number,
    endCycle?: number
  ): Promise<EngineTelemetryResponse> {
    const params = new URLSearchParams();
    if (startCycle !== undefined) params.append('start_cycle', startCycle.toString());
    if (endCycle !== undefined) params.append('end_cycle', endCycle.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<EngineTelemetryResponse>(`/fleet/${engineId}/telemetry${query}`);
  },

  async getEngineReplay(
    engineId: number,
    endCycle?: number,
    predict = false
  ): Promise<EngineReplayResponse> {
    const params = new URLSearchParams();
    if (endCycle !== undefined) params.append('end_cycle', endCycle.toString());
    if (predict) params.append('predict', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<EngineReplayResponse>(`/fleet/${engineId}/replay${query}`);
  },

  async predictRul(payload: TelemetrySequenceRequest): Promise<PredictionResponse> {
    return request<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
    return request<AnalyticsOverviewResponse>('/analytics/overview');
  },

  async getAnalyticsTestParity(): Promise<TestParityResponse> {
    return request<TestParityResponse>('/analytics/test-parity');
  },
};
