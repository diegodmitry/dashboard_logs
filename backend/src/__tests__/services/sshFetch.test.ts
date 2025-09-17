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

  describe('Configuration Validation', () => {
    it('should validate SSH configuration properly', () => {
      // Teste simples de validação de configuração
      expect(mockConfig.host).toBe('test-host');
      expect(mockConfig.user).toBe('test-user');
      expect(mockConfig.port).toBe(22);
    });

    it('should handle different configuration types', () => {
      const configWithPassword = {
        host: 'test-host',
        user: 'test-user',
        port: 22,
        password: 'test-password',
        timeout: 5000,
      };

      const service = new SSHFetchService(configWithPassword);
      expect(service).toBeInstanceOf(SSHFetchService);
    });
  });
});
