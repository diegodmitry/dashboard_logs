// Setup para testes
import dotenv from 'dotenv';

// Carregar variáveis de ambiente de teste
dotenv.config({ path: '.env.test' });

// Configurações globais para testes
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard-test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduzir logs durante testes
