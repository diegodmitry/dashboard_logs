-- Query para Top 10 Errors
-- Esta query pode ser usada para análise avançada no MongoDB ou exportação para outros sistemas

-- MongoDB Aggregation equivalente:
-- db.logs.aggregate([
--   { $match: { level: "error" } },
--   { $group: { _id: "$errorCode", count: { $sum: 1 } } },
--   { $sort: { count: -1 } },
--   { $limit: 10 }
-- ])

-- Para sistemas SQL (exemplo de migração):
SELECT 
    errorCode,
    COUNT(*) as error_count,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence,
    COUNT(DISTINCT source) as affected_sources
FROM logs 
WHERE level = 'error' 
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY errorCode 
ORDER BY error_count DESC 
LIMIT 10;

-- Query com detalhes das mensagens:
SELECT 
    errorCode,
    COUNT(*) as error_count,
    STRING_AGG(DISTINCT message, '; ') as sample_messages,
    STRING_AGG(DISTINCT source, ', ') as sources
FROM logs 
WHERE level = 'error' 
    AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY errorCode 
ORDER BY error_count DESC 
LIMIT 10;
