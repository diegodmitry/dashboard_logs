// Script de inicialização do MongoDB
// Cria índices e configura TTL para a coleção de logs

db = db.getSiblingDB('log-dashboard');

print('Inicializando banco de dados log-dashboard...');

// Criar coleção logs se não existir
db.createCollection('logs');

// Criar índices para performance
print('Criando índices...');

// Índice principal com TTL de 10 dias (864000 segundos)
db.logs.createIndex(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 864000,
    name: "timestamp_ttl"
  }
);

// Índice composto para consultas por nível e timestamp
db.logs.createIndex(
  { level: 1, timestamp: -1 },
  { name: "level_timestamp" }
);

// Índice para errorCode
db.logs.createIndex(
  { errorCode: 1 },
  { name: "errorCode" }
);

// Índice composto para errorCode e timestamp
db.logs.createIndex(
  { errorCode: 1, timestamp: -1 },
  { name: "errorCode_timestamp" }
);

// Índice para source
db.logs.createIndex(
  { source: 1 },
  { name: "source" }
);

// Índice para consultas por período
db.logs.createIndex(
  { timestamp: -1 },
  { name: "timestamp_desc" }
);

print('Índices criados com sucesso!');

// Verificar índices criados
print('Índices existentes:');
db.logs.getIndexes().forEach(function(index) {
  print('- ' + index.name + ': ' + JSON.stringify(index.key));
});

print('Inicialização do MongoDB concluída!');
