import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index';
import { Log } from '../models/Log';

describe('Stats API Integration Tests', () => {
  beforeAll(async () => {
    // Conectar ao banco de teste
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard-test');
  });

  afterAll(async () => {
    // Limpar e desconectar
    await mongoose.connection.db.dropDatabase();
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
});
