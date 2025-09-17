// Setup para testes
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações globais para testes
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/log-dashboard-test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduzir logs durante testes

// Configurações SSH para testes (opcional)
process.env.SSH_HOST = 'localhost';
process.env.SSH_USER = 'test';
process.env.SSH_PORT = '22';
process.env.SSH_KEY_PATH = '/tmp/test_key';
process.env.SSH_TIMEOUT = '5000';

// Timeout global para testes
jest.setTimeout(30000);

// Teste dummy para evitar erro de "no tests"
describe('Setup', () => {
  it('should load test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
