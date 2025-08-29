import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LogIngestService } from '../services/logIngest';
import { SSHFetchService } from '../services/sshFetch';
import logger from '../lib/logger';
import path from 'path';

dotenv.config();

async function ingestLogs() {
  try {
    // Conectar ao MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard';
    await mongoose.connect(mongoUri);
    
    logger.info({
      message: 'Conectado ao MongoDB para ingestão',
      uri: mongoUri.replace(/\/\/.*@/, '//***:***@'),
    });

    // Verificar se há configuração SSH
    const sshConfig = {
      host: process.env.SSH_HOST,
      user: process.env.SSH_USER,
      port: parseInt(process.env.SSH_PORT || '22'),
      privateKeyPath: process.env.SSH_KEY_PATH,
      timeout: parseInt(process.env.SSH_TIMEOUT || '15000'),
    };

    if (sshConfig.host && sshConfig.user && sshConfig.privateKeyPath) {
      logger.info({
        message: 'Iniciando ingestão de logs remotos via SSH',
        host: sshConfig.host,
        user: sshConfig.user,
      });

      try {
        const sshService = new SSHFetchService(sshConfig);
        
        // Buscar logs PTIN específicos
        logger.info({
          message: 'Iniciando busca de logs PTIN',
        });

        // Buscar logs PTIN dos últimos dias
        const ptinLogs = await sshService.fetchPTINLogs(2000);
        
        if (ptinLogs && ptinLogs.trim()) {
          // Salvar logs PTIN localmente
          const today = new Date().toISOString().split('T')[0];
          const localDateDir = path.join(__dirname, '../../logs_in/remote', today);
          await fs.mkdir(localDateDir, { recursive: true });
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const localFilePath = path.join(localDateDir, `ptin-logs-${timestamp}.log`);
          
          await fs.writeFile(localFilePath, ptinLogs, 'utf-8');
          
          logger.info({
            message: 'Logs PTIN salvos com sucesso',
            localFilePath,
            contentLength: ptinLogs.length,
          });

          // TODO: Processar logs PTIN para formato JSON
          // Por enquanto, apenas salvamos como log bruto
        } else {
          logger.warn({
            message: 'Nenhum log PTIN encontrado',
          });
        }

        // Buscar logs gerais também (opcional)
        const remoteLogsPath = '/var/log/application';
        const generalLogsPath = await sshService.fetchAndSaveLogs(remoteLogsPath);
        
        logger.info({
          message: 'Logs gerais baixados com sucesso',
          localFilePath: generalLogsPath,
        });
        
      } catch (sshError) {
        logger.error({
          message: 'Erro ao buscar logs remotos',
          error: sshError instanceof Error ? sshError.message : 'Unknown error',
        });
      }
    } else {
      logger.info({
        message: 'Configuração SSH não encontrada, pulando ingestão remota',
      });
    }

    // Ingerir logs locais se existirem
    const localLogsDir = path.join(__dirname, '../../logs_in');
    const fs = await import('fs/promises');
    
    try {
      const files = await fs.readdir(localLogsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length > 0) {
        logger.info({
          message: 'Encontrados arquivos de logs locais',
          files: jsonFiles,
        });

        for (const file of jsonFiles) {
          const filePath = path.join(localLogsDir, file);
          const result = await LogIngestService.ingestFromFile(filePath);
          
          logger.info({
            message: 'Arquivo de logs processado',
            file,
            success: result.success,
            errors: result.errors,
          });
        }
      } else {
        logger.info({
          message: 'Nenhum arquivo de logs local encontrado',
          directory: localLogsDir,
        });
      }
    } catch (dirError) {
      logger.warn({
        message: 'Diretório de logs locais não encontrado',
        directory: localLogsDir,
        error: dirError instanceof Error ? dirError.message : 'Unknown error',
      });
    }

    // Verificar total de logs no banco
    const totalLogs = await mongoose.connection.db.collection('logs').countDocuments();
    logger.info({
      message: 'Ingestão concluída',
      totalLogs,
    });

    await mongoose.connection.close();
    logger.info({ message: 'Conexão com MongoDB fechada' });

  } catch (error) {
    logger.error({
      message: 'Erro durante ingestão de logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  ingestLogs();
}
