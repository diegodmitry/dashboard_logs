import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LogIngestService } from '../services/logIngest';
import logger from '../lib/logger';

dotenv.config();

// Logs de exemplo para popular o banco
const sampleLogs = [
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
    level: 'error' as const,
    message: 'Database connection failed',
    source: 'api-server',
    errorCode: 'DB_CONN_001',
    context: { retryCount: 3, timeout: 5000 }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutos atrás
    level: 'error' as const,
    message: 'Database connection failed',
    source: 'api-server',
    errorCode: 'DB_CONN_001',
    context: { retryCount: 2, timeout: 5000 }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 minutos atrás
    level: 'warn' as const,
    message: 'High memory usage detected',
    source: 'monitoring',
    context: { memoryUsage: '85%', threshold: '80%' }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutos atrás
    level: 'info' as const,
    message: 'User login successful',
    source: 'auth-service',
    context: { userId: '12345', ip: '192.168.1.100' }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutos atrás
    level: 'error' as const,
    message: 'Invalid authentication token',
    source: 'auth-service',
    errorCode: 'AUTH_001',
    context: { token: 'expired_token_123' }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutos atrás
    level: 'debug' as const,
    message: 'Processing request',
    source: 'api-server',
    context: { endpoint: '/api/users', method: 'GET' }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutos atrás
    level: 'error' as const,
    message: 'Invalid authentication token',
    source: 'auth-service',
    errorCode: 'AUTH_001',
    context: { token: 'invalid_token_456' }
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 1), // 1 minuto atrás
    level: 'info' as const,
    message: 'File upload completed',
    source: 'file-service',
    context: { fileSize: '2.5MB', fileName: 'document.pdf' }
  },
  {
    timestamp: new Date(), // Agora
    level: 'warn' as const,
    message: 'Slow query detected',
    source: 'database',
    context: { queryTime: '2.3s', table: 'users' }
  }
];

// Gerar logs adicionais para ter mais dados
function generateAdditionalLogs() {
  const logs = [];
  const levels = ['error', 'warn', 'info', 'debug'] as const;
  const sources = ['api-server', 'auth-service', 'file-service', 'monitoring', 'database'];
  const errorCodes = ['DB_CONN_001', 'AUTH_001', 'FILE_001', 'NET_001', 'MEM_001'];
  
  // Gerar logs para as últimas 24 horas
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const log: any = {
      timestamp,
      level,
      message: `Sample log message ${i + 1}`,
      source,
    };
    
    // Adicionar errorCode apenas para erros
    if (level === 'error') {
      log.errorCode = errorCodes[Math.floor(Math.random() * errorCodes.length)];
    }
    
    // Adicionar contexto aleatório
    log.context = {
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp.toISOString(),
    };
    
    logs.push(log);
  }
  
  return logs;
}

async function seedLogs() {
  try {
    // Conectar ao MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard';
    await mongoose.connect(mongoUri);
    
    logger.info({
      message: 'Conectado ao MongoDB para seed',
      uri: mongoUri.replace(/\/\/.*@/, '//***:***@'),
    });

    // Limpar logs existentes
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('logs').deleteMany({});
    }
    logger.info({ message: 'Logs existentes removidos' });

    // Ingerir logs de exemplo
    const allLogs = [...sampleLogs, ...generateAdditionalLogs()];
    const result = await LogIngestService.ingestBatch(allLogs);

    logger.info({
      message: 'Seed de logs concluído',
      total: allLogs.length,
      success: result.success,
      errors: result.errors,
    });

    // Verificar dados inseridos
    const totalLogs = mongoose.connection.db 
      ? await mongoose.connection.db.collection('logs').countDocuments()
      : 0;
    logger.info({
      message: 'Total de logs no banco',
      count: totalLogs,
    });

    await mongoose.connection.close();
    logger.info({ message: 'Conexão com MongoDB fechada' });

  } catch (error) {
    logger.error({
      message: 'Erro durante seed de logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedLogs();
}
