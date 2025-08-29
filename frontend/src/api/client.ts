import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs de requisições
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para logs de respostas
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] Erro na resposta:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Tipos para as respostas da API
export interface TopError {
  errorCode: string;
  count: number;
  sampleMessages: string[];
  sources: string[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface LevelDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    period?: {
      from?: string;
      to?: string;
    };
    bucket?: string;
  };
}

// Funções da API
export const api = {
  // Health check
  health: () => apiClient.get('/health'),

  // Top errors
  getTopErrors: (params?: {
    from?: string;
    to?: string;
    limit?: number;
  }) => apiClient.get<ApiResponse<TopError[]>>('/stats/top-errors', { params }),

  // Time series
  getTimeSeries: (params?: {
    from?: string;
    to?: string;
    bucket?: 'hour' | 'day';
  }) => apiClient.get<ApiResponse<TimeSeriesPoint[]>>('/stats/time-series', { params }),

  // Levels distribution
  getLevelsDistribution: (params?: {
    from?: string;
    to?: string;
  }) => apiClient.get<ApiResponse<LevelDistribution[]>>('/stats/levels', { params }),
};
