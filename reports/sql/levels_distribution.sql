-- Query para Distribuição de Níveis
-- Esta query pode ser usada para análise avançada no MongoDB ou exportação para outros sistemas

-- MongoDB Aggregation equivalente:
-- db.logs.aggregate([
--   { $group: { _id: "$level", count: { $sum: 1 } } },
--   { $sort: { count: -1 } }
-- ])

-- Para sistemas SQL (exemplo de migração):
SELECT 
    level,
    COUNT(*) as log_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY level 
ORDER BY log_count DESC;

-- Query com detalhes por período:
SELECT 
    level,
    DATE_TRUNC('hour', timestamp) as hour_bucket,
    COUNT(*) as log_count
FROM logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY level, DATE_TRUNC('hour', timestamp)
ORDER BY hour_bucket, log_count DESC;

-- Query com tendências por nível:
SELECT 
    level,
    DATE_TRUNC('day', timestamp) as day_bucket,
    COUNT(*) as daily_count,
    AVG(COUNT(*)) OVER (
        PARTITION BY level 
        ORDER BY DATE_TRUNC('day', timestamp) 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as weekly_avg
FROM logs 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY level, DATE_TRUNC('day', timestamp)
ORDER BY day_bucket, daily_count DESC;
