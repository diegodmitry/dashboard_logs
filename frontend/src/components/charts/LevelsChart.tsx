import React from 'react';
import Plot from 'react-plotly.js';
import { LevelDistribution } from '../../api/client';

interface LevelsChartProps {
  data: LevelDistribution[];
  loading: boolean;
  error: any;
}

export const LevelsChart: React.FC<LevelsChartProps> = ({
  data,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Carregando distribuição de níveis...</div>
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
        <div className="no-data">Nenhum dado de nível encontrado</div>
      </div>
    );
  }

  const colors = {
    error: '#dc3545',
    warn: '#ffc107',
    info: '#17a2b8',
    debug: '#6c757d',
  };

  const chartData = [
    {
      labels: data.map(item => item.level.toUpperCase()),
      values: data.map(item => item.count),
      type: 'pie' as const,
      hole: 0.4,
      marker: {
        colors: data.map(item => colors[item.level as keyof typeof colors] || '#6c757d'),
      },
      textinfo: 'label+percent' as const,
      textposition: 'outside' as const,
      hovertemplate: 
        '<b>%{label}</b><br>' +
        'Quantidade: %{value}<br>' +
        'Percentual: %{percent}<br>' +
        '<extra></extra>',
    },
  ];

  const layout = {
    title: {
      text: 'Distribuição por Níveis',
      font: { size: 18, color: '#333' },
    },
    margin: { l: 30, r: 30, t: 60, b: 30 },
    height: 400,
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      y: -0.1,
    },
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
  };

  const config: any = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
  };

  return (
    <div className="chart-container">
      <Plot
        data={chartData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        aria-label="Gráfico de pizza mostrando a distribuição de logs por níveis"
      />
    </div>
  );
};
