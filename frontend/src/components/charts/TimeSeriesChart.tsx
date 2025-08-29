import React from 'react';
import Plot from 'react-plotly.js';
import { TimeSeriesPoint } from '../../api/client';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  loading: boolean;
  error: any;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Carregando série temporal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="error">Erro ao carregar dados: {error.message}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-data">Nenhum dado de série temporal encontrado</div>
      </div>
    );
  }

  const timestamps = data.map(item => new Date(item.timestamp));

  const chartData = [
    {
      x: timestamps,
      y: data.map(item => item.errors),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Errors',
      line: { color: '#dc3545', width: 2 },
      marker: { size: 6 },
    },
    {
      x: timestamps,
      y: data.map(item => item.warnings),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Warnings',
      line: { color: '#ffc107', width: 2 },
      marker: { size: 6 },
    },
    {
      x: timestamps,
      y: data.map(item => item.info),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Info',
      line: { color: '#17a2b8', width: 2 },
      marker: { size: 6 },
    },
    {
      x: timestamps,
      y: data.map(item => item.total),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Total',
      line: { color: '#6c757d', width: 3, dash: 'dash' },
      marker: { size: 8 },
    },
  ];

  const layout = {
    title: {
      text: 'Série Temporal de Logs',
      font: { size: 18, color: '#333' },
    },
    xaxis: {
      title: 'Tempo',
      type: 'date' as const,
      tickformat: '%H:%M\n%d/%m',
    },
    yaxis: {
      title: 'Quantidade de Logs',
    },
    margin: { l: 60, r: 30, t: 60, b: 60 },
    height: 400,
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      y: -0.15,
    },
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    hovermode: 'x unified' as const,
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  return (
    <div className="chart-container">
      <Plot
        data={chartData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        aria-label="Gráfico de linha mostrando a série temporal de logs por nível"
      />
    </div>
  );
};
