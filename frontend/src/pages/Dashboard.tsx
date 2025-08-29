import React, { useState } from 'react';
import { useStats } from '../hooks/useStats';
import { TopErrorsChart } from '../components/charts/TopErrorsChart';
import { LevelsChart } from '../components/charts/LevelsChart';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<{
    from?: string;
    to?: string;
  }>({});
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');

  const { useTopErrors, useTimeSeries, useLevelsDistribution, useHealth } = useStats();

  // Buscar dados
  const { data: topErrorsData, error: topErrorsError, isLoading: topErrorsLoading } = useTopErrors({
    ...timeRange,
    limit: 10,
  });

  const { data: timeSeriesData, error: timeSeriesError, isLoading: timeSeriesLoading } = useTimeSeries({
    ...timeRange,
    bucket,
  });

  const { data: levelsData, error: levelsError, isLoading: levelsLoading } = useLevelsDistribution(timeRange);

  const { data: healthData } = useHealth();

  // Função para definir período
  const setPeriod = (hours: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    setTimeRange({
      from: from.toISOString(),
      to: now.toISOString(),
    });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard de Logs</h1>
        <div className="status-indicator">
          Status: {healthData ? '🟢 Online' : '🔴 Offline'}
        </div>
      </header>

      <div className="controls">
        <div className="period-buttons">
          <button onClick={() => setPeriod(1)}>Última hora</button>
          <button onClick={() => setPeriod(24)}>Últimas 24h</button>
          <button onClick={() => setPeriod(168)}>Última semana</button>
          <button onClick={() => setTimeRange({})}>Todo período</button>
        </div>
        
        <div className="bucket-selector">
          <label>
            Agrupamento:
            <select 
              value={bucket} 
              onChange={(e) => setBucket(e.target.value as 'hour' | 'day')}
            >
              <option value="hour">Por hora</option>
              <option value="day">Por dia</option>
            </select>
          </label>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <TopErrorsChart
            data={topErrorsData?.data || []}
            loading={topErrorsLoading}
            error={topErrorsError}
          />
        </div>

        <div className="chart-card">
          <LevelsChart
            data={levelsData?.data || []}
            loading={levelsLoading}
            error={levelsError}
          />
        </div>

        <div className="chart-card full-width">
          <TimeSeriesChart
            data={timeSeriesData?.data || []}
            loading={timeSeriesLoading}
            error={timeSeriesError}
          />
        </div>
      </div>

      <footer className="dashboard-footer">
        <p>
          Última atualização: {new Date().toLocaleString('pt-BR')}
          {timeRange.from && (
            <span> | Período: {new Date(timeRange.from).toLocaleString('pt-BR')} - {timeRange.to ? new Date(timeRange.to).toLocaleString('pt-BR') : 'Agora'}</span>
          )}
        </p>
      </footer>
    </div>
  );
};
