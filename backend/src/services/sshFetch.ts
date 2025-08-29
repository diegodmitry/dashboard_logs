import { Client } from 'ssh2';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../lib/logger';

export interface SSHConfig {
  host: string;
  user: string;
  port: number;
  privateKeyPath?: string;
  password?: string;
  timeout: number;
  // Configurações específicas para MobaXTerm
  keepaliveInterval?: number;
  keepaliveCountMax?: number;
}

export class SSHFetchService {
  private config: SSHConfig;

  constructor(config: SSHConfig) {
    this.config = config;
  }

  /**
   * Conecta via SSH e executa um comando
   */
  private async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';

      conn.on('ready', () => {
        logger.info({
          message: 'Conexão SSH estabelecida',
          host: this.config.host,
          user: this.config.user,
        });

        conn.exec(command, (err: any, stream: any) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code: number) => {
            conn.end();
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error(`Comando falhou com código ${code}`));
            }
          }).on('data', (data: Buffer) => {
            output += data.toString();
          }).stderr.on('data', (data: Buffer) => {
            logger.warn({
              message: 'Erro no comando SSH',
              stderr: data.toString(),
            });
          });
        });
      });

      conn.on('error', (err: any) => {
        logger.error({
          message: 'Erro na conexão SSH',
          error: err.message,
          host: this.config.host,
        });
        reject(err);
      });

      // Configurar conexão SSH
      const connectConfig: any = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.user,
        readyTimeout: this.config.timeout,
        keepaliveInterval: this.config.keepaliveInterval || 10000,
        keepaliveCountMax: this.config.keepaliveCountMax || 3,
      };

      // Usar chave privada ou senha
      if (this.config.privateKeyPath) {
        fs.readFile(this.config.privateKeyPath)
          .then((privateKey: Buffer) => {
            connectConfig.privateKey = privateKey;
            conn.connect(connectConfig);
          })
          .catch((err: any) => {
            logger.error({
              message: 'Erro ao ler chave SSH',
              error: err.message,
              keyPath: this.config.privateKeyPath || 'undefined',
            });
            reject(err);
          });
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
        conn.connect(connectConfig);
      } else {
        reject(new Error('Nenhuma autenticação SSH configurada (chave ou senha)'));
      }
    });
  }

  /**
   * Busca logs remotos via SSH
   */
  async fetchRemoteLogs(
    remotePath: string,
    pattern: string = '*.log',
    maxLines: number = 1000
  ): Promise<string> {
    try {
      logger.info({
        message: 'Iniciando busca de logs remotos',
        remotePath,
        pattern,
        maxLines,
      });

      // Comando para buscar logs
      const command = `find ${remotePath} -name "${pattern}" -type f -exec tail -n ${maxLines} {} + 2>/dev/null || echo "Nenhum arquivo encontrado"`;

      const output = await this.executeCommand(command);

      logger.info({
        message: 'Logs remotos buscados com sucesso',
        outputLength: output.length,
        remotePath,
      });

      return output;
    } catch (error) {
      logger.error({
        message: 'Erro ao buscar logs remotos',
        error: error instanceof Error ? error.message : 'Unknown error',
        remotePath,
      });
      throw error;
    }
  }

  /**
   * Busca logs específicos do PTIN (Mediação)
   */
  async fetchPTINLogs(
    maxLines: number = 1000,
    dateFilter?: string
  ): Promise<string> {
    const ptinPath = '/var/log/ptin/na-mf/collect';
    
    try {
      logger.info({
        message: 'Iniciando busca de logs PTIN',
        path: ptinPath,
        maxLines,
        dateFilter,
      });

      let command: string;
      
      if (dateFilter) {
        // Buscar logs de uma data específica
        command = `find ${ptinPath} -name "*${dateFilter}*" -type f -exec tail -n ${maxLines} {} + 2>/dev/null`;
      } else {
        // Buscar logs mais recentes
        command = `find ${ptinPath} -name "*.log" -type f -mtime -1 -exec tail -n ${maxLines} {} + 2>/dev/null`;
      }

      const output = await this.executeCommand(command);

      logger.info({
        message: 'Logs PTIN buscados com sucesso',
        outputLength: output.length,
        path: ptinPath,
      });

      return output;
    } catch (error) {
      logger.error({
        message: 'Erro ao buscar logs PTIN',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: ptinPath,
      });
      throw error;
    }
  }

  /**
   * Lista arquivos de log disponíveis
   */
  async listLogFiles(remotePath: string): Promise<string[]> {
    try {
      logger.info({
        message: 'Listando arquivos de log',
        remotePath,
      });

      const command = `find ${remotePath} -name "*.log" -type f -exec ls -la {} \\;`;
      const output = await this.executeCommand(command);

      // Parsear a saída do ls
      const files = output
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('total'))
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            permissions: parts[0],
            size: parts[4],
            date: `${parts[5]} ${parts[6]} ${parts[7]}`,
            name: parts[8],
            fullPath: `${remotePath}/${parts[8]}`
          };
        });

      logger.info({
        message: 'Arquivos de log listados',
        count: files.length,
        remotePath,
      });

      return files.map(f => f.fullPath);
    } catch (error) {
      logger.error({
        message: 'Erro ao listar arquivos de log',
        error: error instanceof Error ? error.message : 'Unknown error',
        remotePath,
      });
      throw error;
    }
  }

  /**
   * Baixa arquivo remoto via SCP
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        logger.info({
          message: 'Conexão SSH estabelecida para download',
          remotePath,
          localPath,
        });

        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          sftp.fastGet(remotePath, localPath, (err) => {
            conn.end();
            if (err) {
              reject(err);
            } else {
              logger.info({
                message: 'Arquivo baixado com sucesso',
                remotePath,
                localPath,
              });
              resolve();
            }
          });
        });
      });

      conn.on('error', (err) => {
        logger.error({
          message: 'Erro na conexão SSH para download',
          error: err.message,
        });
        reject(err);
      });

      // Ler chave privada
      if (this.config.privateKeyPath) {
        fs.readFile(this.config.privateKeyPath)
          .then((privateKey: Buffer) => {
            conn.connect({
              host: this.config.host,
              port: this.config.port,
              username: this.config.user,
              privateKey,
              readyTimeout: this.config.timeout,
            });
          })
          .catch((err: any) => {
            logger.error({
              message: 'Erro ao ler chave SSH para download',
              error: err.message,
            });
            reject(err);
          });
      } else {
        reject(new Error('Chave SSH não configurada para download'));
      }
    });
  }

  /**
   * Busca logs e salva localmente
   */
  async fetchAndSaveLogs(
    remotePath: string,
    localDir: string = './logs_in/remote',
    datePattern: string = 'YYYY-MM-DD'
  ): Promise<string> {
    try {
      // Criar diretório local se não existir
      const today: string = new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
      const localDateDir = path.join(localDir!, today);
      
      await fs.mkdir(localDateDir, { recursive: true });

      // Buscar logs remotos
      const logsContent = await this.fetchRemoteLogs(remotePath);
      
      // Salvar localmente
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const localFilePath = path.join(localDateDir, `remote-logs-${timestamp}.log`);
      
      await fs.writeFile(localFilePath, logsContent, 'utf-8');

      logger.info({
        message: 'Logs remotos salvos localmente',
        localFilePath,
        contentLength: logsContent.length,
      });

      return localFilePath;
    } catch (error) {
      logger.error({
        message: 'Erro ao buscar e salvar logs remotos',
        error: error instanceof Error ? error.message : 'Unknown error',
        remotePath,
      });
      throw error;
    }
  }
}
