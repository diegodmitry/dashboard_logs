import { z } from 'zod';
import { Log, ILog } from '../models/Log';
import logger from '../lib/logger';

// Schema de validação para logs
const LogSchema = z.object({
  timestamp: z.string().datetime().or(z.date()),
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string().min(1),
  source: z.string().min(1),
  errorCode: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export type LogInput = z.infer<typeof LogSchema>;

export class LogIngestService {
  /**
   * Valida e ingere um log individual
   */
  static async ingestLog(logData: LogInput): Promise<ILog> {
    try {
      // Validar dados com Zod
      const validatedData = LogSchema.parse(logData);
      
      // Converter timestamp se for string
      const timestamp = typeof validatedData.timestamp === 'string' 
        ? new Date(validatedData.timestamp) 
        : validatedData.timestamp;

      // Criar log no MongoDB
      const log = new Log({
        ...validatedData,
        timestamp,
      });

      const savedLog = await log.save();
      
      logger.info({
        message: 'Log ingerido com sucesso',
        logId: savedLog._id,
        level: savedLog.level,
        source: savedLog.source,
      });

      return savedLog;
    } catch (error) {
      logger.error({
        message: 'Erro ao ingerir log',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: logData,
      });
      throw error;
    }
  }

  /**
   * Inge múltiplos logs em lote
   */
  static async ingestBatch(logsData: LogInput[]): Promise<{ success: number; errors: number }> {
    const results = { success: 0, errors: 0 };

    for (const logData of logsData) {
      try {
        await this.ingestLog(logData);
        results.success++;
      } catch (error) {
        results.errors++;
        logger.error({
          message: 'Erro ao ingerir log em lote',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: logData,
        });
      }
    }

    logger.info({
      message: 'Processamento em lote concluído',
      success: results.success,
      errors: results.errors,
      total: logsData.length,
    });

    return results;
  }

  /**
   * Inge logs de um arquivo JSON local
   */
  static async ingestFromFile(filePath: string): Promise<{ success: number; errors: number }> {
    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const logsData = JSON.parse(fileContent);

      if (!Array.isArray(logsData)) {
        throw new Error('Arquivo deve conter um array de logs');
      }

      return await this.ingestBatch(logsData);
    } catch (error) {
      logger.error({
        message: 'Erro ao ler arquivo de logs',
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
