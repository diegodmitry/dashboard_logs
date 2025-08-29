import React from 'react';
import Plot from 'react-plotly.js';
import { TopError } from '../../api/client';

interface TopErrorsChartProps {
  data: TopError[];
  loading: boolean;
  error: any;
}

export const TopErrorsChart: React.FC<TopErrorsChartProps> = ({
  data,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Carregando top errors...</div>
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
        <div className="no-data">Nenhum erro encontrado</div>
      </div>
    );
  }

  const chartData = [
    {
      x: data.map(item => item.errorCode || 'Sem código'),
      y: data.map(item => item.count),
      type: 'bar' as const,
      marker: {
        color: data.map((_, index) => 
          `rgba(255, ${Math.max(50, 255 - index * 30)}, ${Math.max(50, 255 - index * 50)}, 0.8)`
        ),
      },
      text: data.map(item => item.count.toString()),
      textposition: 'auto' as const,
      hovertemplate: 
        '<b>%{x}</b><br>' +
        'Quantidade: %{y}<br>' +
        'Fontes: %{customdata}<br>' +
        '<extra></extra>',
      customdata: data.map(item => item.sources.join(', ')),
    },
  ];

  const layout = {
    title: {
      text: 'Top 10 Errors',
      font: { size: 18, color: '#333' },
    },
    xaxis: {
      title: 'Código do Erro',
      tickangle: -45,
    },
    yaxis: {
      title: 'Quantidade',
    },
    margin: { l: 60, r: 30, t: 60, b: 80 },
    height: 400,
    showlegend: false,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
  };

  const config = {
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
        aria-label="Gráfico de barras mostrando os top 10 erros por quantidade"
      />
    </div>
  );
};
