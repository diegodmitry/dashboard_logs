import useSWR from 'swr';
import { apiClient, TopError, TimeSeriesPoint, LevelDistribution } from '../api/client';

// Função fetcher para SWR
const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

export const useStats = () => {
  // Hook para top errors
  const useTopErrors = (params?: {
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const queryString = new URLSearchParams();
    if (params?.from) queryString.append('from', params.from);
    if (params?.to) queryString.append('to', params.to);
    if (params?.limit) queryString.append('limit', params.limit.toString());

    const url = `/stats/top-errors${queryString.toString() ? `?${queryString.toString()}` : ''}`;

    return useSWR<{ success: boolean; data: TopError[] }>(
      url,
      fetcher,
      {
        refreshInterval: 30000, // Atualizar a cada 30 segundos
        revalidateOnFocus: true,
      }
    );
  };

  // Hook para time series
  const useTimeSeries = (params?: {
    from?: string;
    to?: string;
    bucket?: 'hour' | 'day';
  }) => {
    const queryString = new URLSearchParams();
    if (params?.from) queryString.append('from', params.from);
    if (params?.to) queryString.append('to', params.to);
    if (params?.bucket) queryString.append('bucket', params.bucket);

    const url = `/stats/time-series${queryString.toString() ? `?${queryString.toString()}` : ''}`;

    return useSWR<{ success: boolean; data: TimeSeriesPoint[] }>(
      url,
      fetcher,
      {
        refreshInterval: 60000, // Atualizar a cada 1 minuto
        revalidateOnFocus: true,
      }
    );
  };

  // Hook para distribuição de níveis
  const useLevelsDistribution = (params?: {
    from?: string;
    to?: string;
  }) => {
    const queryString = new URLSearchParams();
    if (params?.from) queryString.append('from', params.from);
    if (params?.to) queryString.append('to', params.to);

    const url = `/stats/levels${queryString.toString() ? `?${queryString.toString()}` : ''}`;

    return useSWR<{ success: boolean; data: LevelDistribution[] }>(
      url,
      fetcher,
      {
        refreshInterval: 30000, // Atualizar a cada 30 segundos
        revalidateOnFocus: true,
      }
    );
  };

  // Hook para health check
  const useHealth = () => {
    return useSWR<{ status: string; timestamp: string; uptime: number }>(
      '/health',
      fetcher,
      {
        refreshInterval: 10000, // Atualizar a cada 10 segundos
        revalidateOnFocus: true,
      }
    );
  };

  return {
    useTopErrors,
    useTimeSeries,
    useLevelsDistribution,
    useHealth,
  };
};
