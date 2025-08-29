import dotenv from 'dotenv';
import { SSHFetchService } from '../services/sshFetch';
import logger from '../lib/logger';

dotenv.config();

async function testSSHConnection() {
  try {
    logger.info({
      message: 'Iniciando teste de conexão SSH',
    });

    const sshConfig = {
      host: process.env.SSH_HOST || '10.17.145.128',
      user: process.env.SSH_USER || 'ossadmin_altaia',
      port: parseInt(process.env.SSH_PORT || '22'),
      privateKeyPath: process.env.SSH_KEY_PATH,
      password: process.env.SSH_PASSWORD,
      timeout: parseInt(process.env.SSH_TIMEOUT || '15000'),
      keepaliveInterval: parseInt(process.env.SSH_KEEPALIVE_INTERVAL || '10000'),
      keepaliveCountMax: parseInt(process.env.SSH_KEEPALIVE_COUNT_MAX || '3'),
    };

    logger.info({
      message: 'Configuração SSH',
      host: sshConfig.host,
      user: sshConfig.user,
      port: sshConfig.port,
      hasKey: !!sshConfig.privateKeyPath,
      hasPassword: !!sshConfig.password,
    });

    const sshService = new SSHFetchService(sshConfig);

    // Teste 1: Conexão básica
    logger.info({
      message: 'Teste 1: Verificando conexão SSH',
    });

    const whoami = await sshService['executeCommand']('whoami');
    logger.info({
      message: 'Conexão SSH bem-sucedida',
      user: whoami.trim(),
    });

    // Teste 2: Verificar se o diretório PTIN existe
    logger.info({
      message: 'Teste 2: Verificando diretório PTIN',
    });

    const ptinPath = '/var/log/ptin/na-mf/collect';
    const checkPath = await sshService['executeCommand'](`ls -la ${ptinPath}`);
    logger.info({
      message: 'Diretório PTIN encontrado',
      path: ptinPath,
      content: checkPath.substring(0, 200) + '...',
    });

    // Teste 3: Listar arquivos de log PTIN
    logger.info({
      message: 'Teste 3: Listando arquivos de log PTIN',
    });

    const logFiles = await sshService.listLogFiles(ptinPath);
    logger.info({
      message: 'Arquivos de log PTIN encontrados',
      count: logFiles.length,
      files: logFiles.slice(0, 5), // Primeiros 5 arquivos
    });

    // Teste 4: Buscar logs PTIN
    logger.info({
      message: 'Teste 4: Buscando logs PTIN',
    });

    const ptinLogs = await sshService.fetchPTINLogs(100);
    logger.info({
      message: 'Logs PTIN buscados com sucesso',
      contentLength: ptinLogs.length,
      sample: ptinLogs.substring(0, 300) + '...',
    });

    logger.info({
      message: 'Todos os testes SSH passaram com sucesso!',
    });

  } catch (error) {
    logger.error({
      message: 'Erro no teste SSH',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testSSHConnection();
}
