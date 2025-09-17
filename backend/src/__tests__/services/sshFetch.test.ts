import { SSHFetchService, SSHConfig } from '../../services/sshFetch';

// Mock do módulo ssh2
jest.mock('ssh2', () => ({
  Client: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    exec: jest.fn(),
    sftp: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock do fs
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  mkdtemp: jest.fn(),
  rmdir: jest.fn(),
  unlink: jest.fn(),
}));

describe('SSHFetchService', () => {
  let sshService: SSHFetchService;
  let mockConfig: SSHConfig;

  beforeEach(() => {
    mockConfig = {
      host: 'test-host',
      user: 'test-user',
      port: 22,
      privateKeyPath: '/tmp/test-key',
      timeout: 5000,
    };

    sshService = new SSHFetchService(mockConfig);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service with valid config', () => {
      expect(sshService).toBeInstanceOf(SSHFetchService);
    });

    it('should handle config without private key', () => {
      const configWithoutKey = {
        host: 'test-host',
        user: 'test-user',
        port: 22,
        password: 'test-password',
        timeout: 5000,
      };

      const service = new SSHFetchService(configWithoutKey);
      expect(service).toBeInstanceOf(SSHFetchService);
    });
  });

  describe('fetchRemoteLogs', () => {
    it('should handle missing authentication configuration', async () => {
      const serviceWithoutAuth = new SSHFetchService({
        host: 'test-host',
        user: 'test-user',
        port: 22,
        timeout: 5000,
      });

      await expect(serviceWithoutAuth.fetchRemoteLogs('/var/log')).rejects.toThrow('Nenhuma autenticação SSH configurada');
    });

    it('should handle private key file read errors', async () => {
      const fs = require('fs/promises');
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory, open \'/tmp/test-key\''));

      await expect(sshService.fetchRemoteLogs('/var/log')).rejects.toThrow('ENOENT: no such file or directory, open \'/tmp/test-key\'');
    });
  });

  describe('downloadFile', () => {
    it('should reject when no private key is configured', async () => {
      const serviceWithoutKey = new SSHFetchService({
        host: 'test-host',
        user: 'test-user',
        port: 22,
        timeout: 5000,
      });

      await expect(serviceWithoutKey.downloadFile('/remote/file.log', '/local/file.log')).rejects.toThrow('Chave SSH não configurada para download');
    });
  });
});
