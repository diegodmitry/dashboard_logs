import request from 'supertest';
import mongoose from 'mongoose';

import { app, connectToDatabase } from '../index';
import { Log } from '../models/Log';

describe('Stats API Integration Tests', () => {
  beforeAll(async () => {
    // Conectar ao banco de teste
    await connectToDatabase();
  });

  afterAll(async () => {
    // Limpar e desconectar
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await Log.deleteMany({});
  });

  describe('GET /stats/top-errors', () => {
    it('should return empty array when no errors exist', async () => {
      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should return top errors when they exist', async () => {
      // Criar logs de teste
      const testLogs = [
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Database connection failed',
          source: 'api-server',
          errorCode: 'DB_CONN_001',
        },
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Database connection failed',
          source: 'api-server',
          errorCode: 'DB_CONN_001',
        },
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Authentication failed',
          source: 'auth-service',
          errorCode: 'AUTH_001',
        },
        {
          timestamp: new Date(),
          level: 'info',
          message: 'User login successful',
          source: 'auth-service',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);

      // Verificar que DB_CONN_001 aparece primeiro (mais frequente)
      expect(response.body.data[0].errorCode).toBe('DB_CONN_001');
      expect(response.body.data[0].count).toBe(2);
      expect(response.body.data[1].errorCode).toBe('AUTH_001');
      expect(response.body.data[1].count).toBe(1);
    });

    it('should respect limit parameter', async () => {
      // Criar múltiplos erros
      const testLogs = Array.from({ length: 15 }, (_, i) => ({
        timestamp: new Date(),
        level: 'error',
        message: `Error ${i}`,
        source: 'test',
        errorCode: `ERROR_${i}`,
      }));

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/top-errors?limit=5')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta.total).toBe(5);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const testLogs = [
        {
          timestamp: now,
          level: 'error',
          message: 'Recent error',
          source: 'test',
          errorCode: 'RECENT_001',
        },
        {
          timestamp: twoHoursAgo,
          level: 'error',
          message: 'Old error',
          source: 'test',
          errorCode: 'OLD_001',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get(`/stats/top-errors?from=${oneHourAgo.toISOString()}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].errorCode).toBe('RECENT_001');
    });

    it('should handle invalid parameters gracefully', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });
  });

  describe('GET /stats/time-series', () => {
    it('should return time series data', async () => {
      // Criar logs de teste com diferentes timestamps
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const testLogs = [
        {
          timestamp: now,
          level: 'error',
          message: 'Recent error',
          source: 'api-server',
        },
        {
          timestamp: oneHourAgo,
          level: 'info',
          message: 'Old info',
          source: 'api-server',
        },
        {
          timestamp: oneHourAgo,
          level: 'warn',
          message: 'Old warning',
          source: 'api-server',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/time-series?bucket=hour')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.bucket).toBe('hour');
      
      // Verificar estrutura dos dados
      expect(response.body.data[0]).toHaveProperty('timestamp');
      expect(response.body.data[0]).toHaveProperty('total');
      expect(response.body.data[0]).toHaveProperty('errors');
      expect(response.body.data[0]).toHaveProperty('warnings');
      expect(response.body.data[0]).toHaveProperty('info');
    });

    it('should handle day bucket correctly', async () => {
      const testLogs = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          level: 'error',
          message: 'Error 1',
          source: 'test',
        },
        {
          timestamp: new Date('2024-01-02T10:00:00Z'),
          level: 'info',
          message: 'Info 1',
          source: 'test',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/time-series?bucket=day')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.bucket).toBe('day');
    });
  });

  describe('GET /stats/levels', () => {
    it('should return levels distribution', async () => {
      const testLogs = [
        { timestamp: new Date(), level: 'error', message: 'Error 1', source: 'test' },
        { timestamp: new Date(), level: 'error', message: 'Error 2', source: 'test' },
        { timestamp: new Date(), level: 'warn', message: 'Warning 1', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Info 1', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Info 2', source: 'test' },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.total).toBe(5);

      // Verificar estrutura dos dados
      expect(response.body.data[0]).toHaveProperty('level');
      expect(response.body.data[0]).toHaveProperty('count');
      expect(response.body.data[0]).toHaveProperty('percentage');

      // Verificar ordenação por count
      expect(response.body.data[0].count).toBeGreaterThanOrEqual(response.body.data[1].count);
    });

    it('should filter levels by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const testLogs = [
        {
          timestamp: now,
          level: 'error',
          message: 'Recent error',
          source: 'test',
        },
        {
          timestamp: oneHourAgo,
          level: 'info',
          message: 'Old info',
          source: 'test',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get(`/stats/levels?from=${oneHourAgo.toISOString()}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.environment).toBe('test');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Rota não encontrada');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/stats')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle large request payloads', async () => {
      const largePayload = 'x'.repeat(1000000); // 1MB
      
      const response = await request(app)
        .post('/stats')
        .set('Content-Type', 'application/json')
        .send({ data: largePayload })
        .expect(404); // Rota não existe, mas testa limite de payload
    });
  });

  describe('Performance Tests', () => {
    it('should handle large dataset efficiently', async () => {
      // Criar um grande conjunto de dados
      const testLogs = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000), // 1 min apart
        level: ['error', 'warn', 'info', 'debug'][i % 4],
        message: `Test message ${i}`,
        source: `service-${i % 10}`,
        errorCode: i % 100 === 0 ? `ERROR_${i}` : undefined,
      }));

      await Log.insertMany(testLogs);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/stats/top-errors?limit=10')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Deve responder em menos de 5 segundos
    });
  });
});
