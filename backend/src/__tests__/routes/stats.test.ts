import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import statsRoutes from '../../routes/stats';
import { Log } from '../../models/Log';

// Criar app de teste sem inicializar o servidor
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/stats', statsRoutes);
  return app;
};

describe('Stats Routes Unit Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Conectar ao banco de teste
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard-test');
    app = createTestApp();
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

    it('should return top errors sorted by frequency', async () => {
      // Criar logs de teste com diferentes frequências
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
          level: 'error',
          message: 'Authentication failed',
          source: 'auth-service',
          errorCode: 'AUTH_001',
        },
        {
          timestamp: new Date(),
          level: 'error',
          message: 'File not found',
          source: 'file-service',
          errorCode: 'FILE_001',
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
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.total).toBe(3);

      // Verificar ordenação por frequência (mais frequente primeiro)
      expect(response.body.data[0].errorCode).toBe('DB_CONN_001');
      expect(response.body.data[0].count).toBe(3);
      expect(response.body.data[1].errorCode).toBe('AUTH_001');
      expect(response.body.data[1].count).toBe(2);
      expect(response.body.data[2].errorCode).toBe('FILE_001');
      expect(response.body.data[2].count).toBe(1);
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

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle limit parameter out of range', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=150')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should include sample messages and sources in response', async () => {
      const testLogs = [
        {
          timestamp: new Date(),
          level: 'error',
          message: 'First error message',
          source: 'service-a',
          errorCode: 'TEST_001',
        },
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Second error message',
          source: 'service-b',
          errorCode: 'TEST_001',
        },
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Third error message',
          source: 'service-a',
          errorCode: 'TEST_001',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.data[0].errorCode).toBe('TEST_001');
      expect(response.body.data[0].count).toBe(3);
      expect(response.body.data[0].sampleMessages).toHaveLength(3);
      expect(response.body.data[0].sources).toEqual(['service-a', 'service-b']);
    });
  });

  describe('GET /stats/time-series', () => {
    it('should return empty array when no logs exist', async () => {
      const response = await request(app)
        .get('/stats/time-series')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.bucket).toBe('hour');
    });

    it('should return time series data grouped by hour', async () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      const testLogs = [
        {
          timestamp: new Date(baseTime.getTime()),
          level: 'error',
          message: 'Error 1',
          source: 'test',
        },
        {
          timestamp: new Date(baseTime.getTime() + 30 * 60 * 1000), // 30 min later
          level: 'warn',
          message: 'Warning 1',
          source: 'test',
        },
        {
          timestamp: new Date(baseTime.getTime() + 60 * 60 * 1000), // 1 hour later
          level: 'info',
          message: 'Info 1',
          source: 'test',
        },
        {
          timestamp: new Date(baseTime.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000), // 1.5 hours later
          level: 'error',
          message: 'Error 2',
          source: 'test',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/time-series?bucket=hour')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.bucket).toBe('hour');

      // Verificar primeira hora
      expect(response.body.data[0].total).toBe(2);
      expect(response.body.data[0].errors).toBe(1);
      expect(response.body.data[0].warnings).toBe(1);
      expect(response.body.data[0].info).toBe(0);

      // Verificar segunda hora
      expect(response.body.data[1].total).toBe(2);
      expect(response.body.data[1].errors).toBe(1);
      expect(response.body.data[1].warnings).toBe(0);
      expect(response.body.data[1].info).toBe(1);
    });

    it('should return time series data grouped by day', async () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      const testLogs = [
        {
          timestamp: new Date(baseTime.getTime()),
          level: 'error',
          message: 'Error 1',
          source: 'test',
        },
        {
          timestamp: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000), // Next day
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
        },
        {
          timestamp: twoHoursAgo,
          level: 'error',
          message: 'Old error',
          source: 'test',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get(`/stats/time-series?from=${oneHourAgo.toISOString()}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].total).toBe(1);
    });

    it('should handle invalid bucket parameter', async () => {
      const response = await request(app)
        .get('/stats/time-series?bucket=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });
  });

  describe('GET /stats/levels', () => {
    it('should return empty array when no logs exist', async () => {
      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should return levels distribution with correct counts and percentages', async () => {
      const testLogs = [
        { timestamp: new Date(), level: 'error', message: 'Error 1', source: 'test' },
        { timestamp: new Date(), level: 'error', message: 'Error 2', source: 'test' },
        { timestamp: new Date(), level: 'warn', message: 'Warning 1', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Info 1', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Info 2', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Info 3', source: 'test' },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.total).toBe(6);

      // Verificar ordenação por count (decrescente)
      expect(response.body.data[0].level).toBe('info');
      expect(response.body.data[0].count).toBe(3);
      expect(response.body.data[0].percentage).toBe(50);

      expect(response.body.data[1].level).toBe('error');
      expect(response.body.data[1].count).toBe(2);
      expect(response.body.data[1].percentage).toBe(33);

      expect(response.body.data[2].level).toBe('warn');
      expect(response.body.data[2].count).toBe(1);
      expect(response.body.data[2].percentage).toBe(17);
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
        },
        {
          timestamp: twoHoursAgo,
          level: 'info',
          message: 'Old info',
          source: 'test',
        },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get(`/stats/levels?from=${oneHourAgo.toISOString()}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].level).toBe('error');
      expect(response.body.data[0].count).toBe(1);
      expect(response.body.meta.total).toBe(1);
    });

    it('should handle percentage calculation with zero total', async () => {
      // Este teste é mais para garantir que não há divisão por zero
      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed date parameters', async () => {
      const response = await request(app)
        .get('/stats/top-errors?from=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle missing query parameters gracefully', async () => {
      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Deve usar valores padrão
    });
  });
});
