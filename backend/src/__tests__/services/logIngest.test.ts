
import mongoose from 'mongoose';
import { LogIngestService, LogInput } from '../../services/logIngest';
import { Log } from '../../models/Log';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('LogIngestService', () => {
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

  describe('ingestLog', () => {
    it('should successfully ingest a valid log', async () => {
      const logData: LogInput = {
        timestamp: new Date(),
        level: 'error',
        message: 'Test error message',
        source: 'test-service',
        errorCode: 'TEST_001',
        context: { userId: '123', action: 'login' },
      };

      const result = await LogIngestService.ingestLog(logData);

      expect(result._id).toBeDefined();
      expect(result.level).toBe('error');
      expect(result.message).toBe('Test error message');
      expect(result.source).toBe('test-service');
      expect(result.errorCode).toBe('TEST_001');
      expect(result.context).toEqual({ userId: '123', action: 'login' });
    });

    it('should handle timestamp as string', async () => {
      const logData: LogInput = {
        timestamp: '2024-01-01T10:00:00Z',
        level: 'info',
        message: 'Test message',
        source: 'test-service',
      };

      const result = await LogIngestService.ingestLog(logData);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should handle minimal log data', async () => {
      const logData: LogInput = {
        timestamp: new Date(),
        level: 'info',
        message: 'Simple message',
        source: 'test-service',
      };

      const result = await LogIngestService.ingestLog(logData);

      expect(result._id).toBeDefined();
      expect(result.level).toBe('info');
      expect(result.message).toBe('Simple message');
      expect(result.source).toBe('test-service');
      expect(result.errorCode).toBeUndefined();
      expect(result.context).toBeUndefined();
    });

    it('should reject invalid level', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'invalid' as any,
        message: 'Test message',
        source: 'test-service',
      } as LogInput;

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      const logData = {
        timestamp: new Date(),
        level: 'error',
        // message missing
        source: 'test-service',
      } as LogInput;

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();
    });

    it('should reject empty message', async () => {
      const logData: LogInput = {
        timestamp: new Date(),
        level: 'error',
        message: '',
        source: 'test-service',
      };

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();
    });

    it('should reject empty source', async () => {
      const logData: LogInput = {
        timestamp: new Date(),
        level: 'error',
        message: 'Test message',
        source: '',
      };

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();
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

      const logData: LogInput = {
        timestamp: new Date(),
        level: 'info',
        message: 'Complex context test',
        source: 'test-service',
        context: complexContext,
      };

      const result = await LogIngestService.ingestLog(logData);

      expect(result.context).toEqual(complexContext);
    });
  });

  describe('ingestBatch', () => {
    it('should successfully ingest multiple valid logs', async () => {
      const logsData: LogInput[] = [
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Error 1',
          source: 'service-a',
          errorCode: 'ERR_001',
        },
        {
          timestamp: new Date(),
          level: 'warn',
          message: 'Warning 1',
          source: 'service-b',
        },
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Info 1',
          source: 'service-c',
        },
      ];

      const result = await LogIngestService.ingestBatch(logsData);

      expect(result.success).toBe(3);
      expect(result.errors).toBe(0);

      // Verificar se os logs foram salvos
      const savedLogs = await Log.find({});
      expect(savedLogs).toHaveLength(3);
    });

    it('should handle mixed valid and invalid logs', async () => {
      const logsData: LogInput[] = [
        {
          timestamp: new Date(),
          level: 'error',
          message: 'Valid error',
          source: 'service-a',
        },
        {
          timestamp: new Date(),
          level: 'invalid' as any, // Invalid level
          message: 'Invalid log',
          source: 'service-b',
        },
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Valid info',
          source: 'service-c',
        },
      ];

      const result = await LogIngestService.ingestBatch(logsData);

      expect(result.success).toBe(2);
      expect(result.errors).toBe(1);

      // Verificar se apenas os logs válidos foram salvos
      const savedLogs = await Log.find({});
      expect(savedLogs).toHaveLength(2);
    });

    it('should handle empty batch', async () => {
      const result = await LogIngestService.ingestBatch([]);

      expect(result.success).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle large batch efficiently', async () => {
      const logsData: LogInput[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        level: ['error', 'warn', 'info', 'debug'][i % 4] as any,
        message: `Test message ${i}`,
        source: `service-${i % 10}`,
        errorCode: i % 20 === 0 ? `ERROR_${i}` : undefined,
      }));

      const startTime = Date.now();
      const result = await LogIngestService.ingestBatch(logsData);
      const endTime = Date.now();

      expect(result.success).toBe(100);
      expect(result.errors).toBe(0);
      expect(endTime - startTime).toBeLessThan(10000); // Deve processar em menos de 10 segundos

      // Verificar se todos os logs foram salvos
      const savedLogs = await Log.find({});
      expect(savedLogs).toHaveLength(100);
    });
  });

  describe('ingestFromFile', () => {
    let tempDir: string;
    let tempFile: string;

    beforeEach(async () => {
      // Criar diretório temporário
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-ingest-test-'));
    });

    afterEach(async () => {
      // Limpar arquivo temporário
      try {
        await fs.unlink(tempFile);
        await fs.rmdir(tempDir);
      } catch (error) {
        // Ignorar erros de limpeza
      }
    });

    it('should successfully ingest logs from valid JSON file', async () => {
      const logsData = [
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Error from file',
          source: 'file-service',
          errorCode: 'FILE_001',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Info from file',
          source: 'file-service',
        },
      ];

      tempFile = path.join(tempDir, 'test-logs.json');
      await fs.writeFile(tempFile, JSON.stringify(logsData, null, 2));

      const result = await LogIngestService.ingestFromFile(tempFile);

      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);

      // Verificar se os logs foram salvos
      const savedLogs = await Log.find({});
      expect(savedLogs).toHaveLength(2);
    });

    it('should handle file with mixed valid and invalid logs', async () => {
      const logsData = [
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Valid error',
          source: 'file-service',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'invalid', // Invalid level
          message: 'Invalid log',
          source: 'file-service',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Valid info',
          source: 'file-service',
        },
      ];

      tempFile = path.join(tempDir, 'mixed-logs.json');
      await fs.writeFile(tempFile, JSON.stringify(logsData, null, 2));

      const result = await LogIngestService.ingestFromFile(tempFile);

      expect(result.success).toBe(2);
      expect(result.errors).toBe(1);
    });

    it('should reject non-array JSON file', async () => {
      const invalidData = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Single log object',
        source: 'file-service',
      };

      tempFile = path.join(tempDir, 'invalid-logs.json');
      await fs.writeFile(tempFile, JSON.stringify(invalidData, null, 2));

      await expect(LogIngestService.ingestFromFile(tempFile)).rejects.toThrow('Arquivo deve conter um array de logs');
    });

    it('should handle non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.json');

      await expect(LogIngestService.ingestFromFile(nonExistentFile)).rejects.toThrow();
    });

    it('should handle malformed JSON file', async () => {
      tempFile = path.join(tempDir, 'malformed.json');
      await fs.writeFile(tempFile, '{ invalid json }');

      await expect(LogIngestService.ingestFromFile(tempFile)).rejects.toThrow();
    });

    it('should handle empty JSON file', async () => {
      tempFile = path.join(tempDir, 'empty.json');
      await fs.writeFile(tempFile, '[]');

      const result = await LogIngestService.ingestFromFile(tempFile);

      expect(result.success).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Fechar conexão para simular erro de banco
      await mongoose.connection.close();

      const logData: LogInput = {
        timestamp: new Date(),
        level: 'error',
        message: 'Test message',
        source: 'test-service',
      };

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();

      // Reconectar para outros testes
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard-test');
    });

    it('should handle malformed timestamp strings', async () => {
      const logData = {
        timestamp: 'invalid-date-string',
        level: 'error',
        message: 'Test message',
        source: 'test-service',
      } as LogInput;

      await expect(LogIngestService.ingestLog(logData)).rejects.toThrow();
    });
  });
});
