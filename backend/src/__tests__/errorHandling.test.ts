import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index';
import { Log } from '../models/Log';

describe('Error Handling and Edge Cases', () => {
  beforeAll(async () => {
    // Conectar ao banco de teste
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard-test');
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

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long messages', async () => {
      const longMessage = 'A'.repeat(100000); // 100KB message
      
      const testLog = {
        timestamp: new Date(),
        level: 'info',
        message: longMessage,
        source: 'test-service',
      };

      await Log.create(testLog);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].count).toBe(1);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Log with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      
      const testLog = {
        timestamp: new Date(),
        level: 'error',
        message: specialMessage,
        source: 'test-service',
        errorCode: 'SPECIAL_001',
      };

      await Log.create(testLog);

      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].errorCode).toBe('SPECIAL_001');
    });

    it('should handle unicode characters', async () => {
      const unicodeMessage = 'Log with unicode: 🚀 ñáéíóú ção 中文 العربية';
      
      const testLog = {
        timestamp: new Date(),
        level: 'warn',
        message: unicodeMessage,
        source: 'test-service',
      };

      await Log.create(testLog);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].count).toBe(1);
    });

    it('should handle very old timestamps', async () => {
      const oldTimestamp = new Date('1970-01-01T00:00:00Z');
      
      const testLog = {
        timestamp: oldTimestamp,
        level: 'info',
        message: 'Very old log',
        source: 'legacy-service',
      };

      await Log.create(testLog);

      const response = await request(app)
        .get('/stats/time-series?bucket=day')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle future timestamps', async () => {
      const futureTimestamp = new Date('2030-01-01T00:00:00Z');
      
      const testLog = {
        timestamp: futureTimestamp,
        level: 'info',
        message: 'Future log',
        source: 'future-service',
      };

      await Log.create(testLog);

      const response = await request(app)
        .get('/stats/time-series?bucket=day')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Query Parameter Edge Cases', () => {
    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=999999')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle negative limit values', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle zero limit values', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app)
        .get('/stats/top-errors?from=not-a-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle invalid bucket values', async () => {
      const response = await request(app)
        .get('/stats/time-series?bucket=invalid-bucket')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle empty query parameters', async () => {
      const response = await request(app)
        .get('/stats/top-errors?from=&to=&limit=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle multiple query parameters with same name', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=5&limit=10')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });
  });

  describe('Database Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle database with only non-error logs', async () => {
      const testLogs = [
        { timestamp: new Date(), level: 'info', message: 'Info 1', source: 'test' },
        { timestamp: new Date(), level: 'warn', message: 'Warning 1', source: 'test' },
        { timestamp: new Date(), level: 'debug', message: 'Debug 1', source: 'test' },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle logs without error codes', async () => {
      const testLogs = [
        { timestamp: new Date(), level: 'error', message: 'Error without code', source: 'test' },
        { timestamp: new Date(), level: 'error', message: 'Another error', source: 'test' },
      ];

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/top-errors')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      // Logs sem errorCode são agrupados em um único item com errorCode: null
      expect(response.body.data[0].errorCode).toBeNull();
      expect(response.body.data[0].count).toBe(2);
    });

    it('should handle very large datasets efficiently', async () => {
      // Criar um grande conjunto de dados
      const testLogs = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000), // 1 segundo apart
        level: ['error', 'warn', 'info', 'debug'][i % 4],
        message: `Test message ${i}`,
        source: `service-${i % 100}`,
        errorCode: i % 1000 === 0 ? `ERROR_${i}` : undefined,
      }));

      await Log.insertMany(testLogs);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/stats/top-errors?limit=10')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(10000); // Deve responder em menos de 10 segundos
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent requests', async () => {
      // Criar dados de teste
      const testLogs = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        level: 'error',
        message: `Error ${i}`,
        source: 'test',
        errorCode: `ERROR_${i % 10}`,
      }));

      await Log.insertMany(testLogs);

      // Fazer múltiplas requisições simultâneas
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/stats/top-errors?limit=5')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // Todas as respostas devem ser válidas
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(5);
      });
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should handle memory-intensive queries gracefully', async () => {
      // Criar logs com contextos grandes
      const largeContext = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `Large value ${i}`.repeat(100),
        })),
      };

      const testLogs = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        level: 'info',
        message: `Log with large context ${i}`,
        source: 'test',
        context: largeContext,
      }));

      await Log.insertMany(testLogs);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].count).toBe(100);
    });
  });

  describe('Network and Timeout Edge Cases', () => {
    it('should handle very long URLs', async () => {
      const longParam = 'a'.repeat(10000);
      
      const response = await request(app)
        .get(`/stats/top-errors?from=${longParam}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Parâmetros inválidos');
    });

    it('should handle malformed request headers', async () => {
      const response = await request(app)
        .get('/stats/top-errors')
        .set('Content-Type', 'invalid/content-type')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during concurrent writes', async () => {
      // Simular escrita concorrente
      const writePromises = Array.from({ length: 50 }, (_, i) =>
        Log.create({
          timestamp: new Date(),
          level: 'info',
          message: `Concurrent log ${i}`,
          source: 'concurrent-test',
        })
      );

      await Promise.all(writePromises);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].count).toBe(50);
    });

    it('should handle partial data corruption gracefully', async () => {
      // Criar logs válidos
      const validLogs = [
        { timestamp: new Date(), level: 'error', message: 'Valid error', source: 'test' },
        { timestamp: new Date(), level: 'info', message: 'Valid info', source: 'test' },
      ];

      await Log.insertMany(validLogs);

      const response = await request(app)
        .get('/stats/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid limit', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle maximum valid limit', async () => {
      const response = await request(app)
        .get('/stats/top-errors?limit=100')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle boundary date values', async () => {
      const epochDate = '1970-01-01T00:00:00.000Z';
      const farFutureDate = '2099-12-31T23:59:59.999Z';

      const response1 = await request(app)
        .get(`/stats/top-errors?from=${epochDate}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/stats/top-errors?to=${farFutureDate}`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });
  });
});
