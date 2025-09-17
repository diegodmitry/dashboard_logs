import mongoose from 'mongoose';
import { Log, ILog } from '../../models/Log';

describe('Log Model', () => {
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

  describe('Schema Validation', () => {
    it('should create a valid log entry', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'error' as const,
        message: 'Test error message',
        source: 'test-service',
        errorCode: 'TEST_001',
        context: { userId: '123', action: 'login' },
      };

      const log = new Log(logData);
      const savedLog = await log.save();

      expect(savedLog._id).toBeDefined();
      expect(savedLog.timestamp).toEqual(logData.timestamp);
      expect(savedLog.level).toBe(logData.level);
      expect(savedLog.message).toBe(logData.message);
      expect(savedLog.source).toBe(logData.source);
      expect(savedLog.errorCode).toBe(logData.errorCode);
      expect(savedLog.context).toEqual(logData.context);
      expect(savedLog.createdAt).toBeDefined();
      expect(savedLog.updatedAt).toBeDefined();
    });

    it('should create a log entry without optional fields', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Simple info message',
        source: 'test-service',
      };

      const log = new Log(logData);
      const savedLog = await log.save();

      expect(savedLog._id).toBeDefined();
      expect(savedLog.level).toBe('info');
      expect(savedLog.message).toBe('Simple info message');
      expect(savedLog.errorCode).toBeUndefined();
      expect(savedLog.context).toBeUndefined();
    });

    it('should reject invalid level values', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'invalid' as any,
        message: 'Test message',
        source: 'test-service',
      };

      const log = new Log(logData);
      
      await expect(log.save()).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      const logData = {
        timestamp: new Date(),
        // level missing
        message: 'Test message',
        source: 'test-service',
      };

      const log = new Log(logData);
      
      await expect(log.save()).rejects.toThrow();
    });

    it('should reject missing timestamp', async () => {
      const logData = {
        // timestamp missing
        level: 'error' as const,
        message: 'Test message',
        source: 'test-service',
      };

      const log = new Log(logData);
      
      await expect(log.save()).rejects.toThrow();
    });

    it('should reject missing message', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'error' as const,
        // message missing
        source: 'test-service',
      };

      const log = new Log(logData);
      
      await expect(log.save()).rejects.toThrow();
    });

    it('should reject missing source', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'error' as const,
        message: 'Test message',
        // source missing
      };

      const log = new Log(logData);
      
      await expect(log.save()).rejects.toThrow();
    });
  });

  describe('Data Types', () => {
    it('should handle different log levels correctly', async () => {
      const levels = ['error', 'warn', 'info', 'debug'] as const;
      
      for (const level of levels) {
        const logData = {
          timestamp: new Date(),
          level,
          message: `${level} message`,
          source: 'test-service',
        };

        const log = new Log(logData);
        const savedLog = await log.save();
        
        expect(savedLog.level).toBe(level);
      }
    });

    it('should handle complex context objects', async () => {
      const complexContext = {
        user: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        request: {
          method: 'POST',
          url: '/api/users',
          headers: {
            'user-agent': 'Mozilla/5.0',
            'content-type': 'application/json',
          },
        },
        metadata: {
          version: '1.0.0',
          environment: 'test',
        },
      };

      const logData = {
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Complex context test',
        source: 'test-service',
        context: complexContext,
      };

      const log = new Log(logData);
      const savedLog = await log.save();
      
      expect(savedLog.context).toEqual(complexContext);
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB message
      
      const logData = {
        timestamp: new Date(),
        level: 'info' as const,
        message: longMessage,
        source: 'test-service',
      };

      const log = new Log(logData);
      const savedLog = await log.save();
      
      expect(savedLog.message).toBe(longMessage);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Timestamp test',
        source: 'test-service',
      };

      const log = new Log(logData);
      const savedLog = await log.save();
      
      expect(savedLog.createdAt).toBeDefined();
      expect(savedLog.updatedAt).toBeDefined();
      expect(savedLog.createdAt).toBeInstanceOf(Date);
      expect(savedLog.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt when document is modified', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Original message',
        source: 'test-service',
      };

      const log = new Log(logData);
      const savedLog = await log.save();
      
      const originalUpdatedAt = savedLog.updatedAt;
      
      // Aguardar um pouco para garantir diferença de tempo
      await new Promise(resolve => setTimeout(resolve, 10));
      
      savedLog.message = 'Updated message';
      const updatedLog = await savedLog.save();
      
      expect(updatedLog.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Criar dados de teste
      const testLogs = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          level: 'error' as const,
          message: 'Error 1',
          source: 'service-a',
          errorCode: 'ERR_001',
        },
        {
          timestamp: new Date('2024-01-01T11:00:00Z'),
          level: 'warn' as const,
          message: 'Warning 1',
          source: 'service-b',
        },
        {
          timestamp: new Date('2024-01-01T12:00:00Z'),
          level: 'info' as const,
          message: 'Info 1',
          source: 'service-a',
        },
        {
          timestamp: new Date('2024-01-02T10:00:00Z'),
          level: 'error' as const,
          message: 'Error 2',
          source: 'service-c',
          errorCode: 'ERR_002',
        },
      ];

      await Log.insertMany(testLogs);
    });

    it('should find logs by level', async () => {
      const errorLogs = await Log.find({ level: 'error' });
      expect(errorLogs).toHaveLength(2);
      
      const infoLogs = await Log.find({ level: 'info' });
      expect(infoLogs).toHaveLength(1);
    });

    it('should find logs by source', async () => {
      const serviceALogs = await Log.find({ source: 'service-a' });
      expect(serviceALogs).toHaveLength(2);
    });

    it('should find logs by error code', async () => {
      const err001Logs = await Log.find({ errorCode: 'ERR_001' });
      expect(err001Logs).toHaveLength(1);
      expect(err001Logs[0]?.message).toBe('Error 1');
    });

    it('should find logs by date range', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');
      
      const logsInRange = await Log.find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });
      
      expect(logsInRange).toHaveLength(3);
    });

    it('should sort logs by timestamp', async () => {
      const sortedLogs = await Log.find({}).sort({ timestamp: 1 });
      
      expect(sortedLogs[0]?.timestamp).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(sortedLogs[3]?.timestamp).toEqual(new Date('2024-01-02T10:00:00Z'));
    });
  });
});
