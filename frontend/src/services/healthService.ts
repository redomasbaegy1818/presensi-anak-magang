import type { ApiHealthStatus } from '../types/domain.ts';
import { apiRequest } from './apiClient.ts';

export function getSystemHealth(): Promise<ApiHealthStatus> {
  return apiRequest<ApiHealthStatus>('/health');
}
