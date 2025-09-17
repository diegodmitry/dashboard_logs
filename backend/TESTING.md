# Guia de Testes - Dashboard de Logs

Este documento descreve a estrutura de testes do projeto e como executá-los.

## Estrutura de Testes

```
src/__tests__/
├── setup.ts                    # Configuração global dos testes
├── models/
│   └── Log.test.ts            # Testes unitários do modelo Log
├── routes/
│   └── stats.test.ts          # Testes unitários das rotas de stats
├── services/
│   ├── logIngest.test.ts      # Testes do serviço de ingestão
│   └── sshFetch.test.ts       # Testes do serviço SSH (com mocks)
├── stats.integration.test.ts  # Testes de integração completos
└── errorHandling.test.ts      # Testes de tratamento de erros e edge cases
```

## Tipos de Testes

### 1. Testes Unitários
- **Modelos**: Validação de schema, operações CRUD, validações de dados
- **Rotas**: Validação de parâmetros, respostas, tratamento de erros
- **Serviços**: Lógica de negócio, validações, transformações de dados

### 2. Testes de Integração
- **APIs**: Fluxo completo de requisições HTTP
- **Banco de Dados**: Operações com MongoDB
- **Performance**: Testes com grandes volumes de dados

### 3. Testes de Tratamento de Erros
- **Edge Cases**: Valores extremos, dados malformados
- **Concorrência**: Acesso simultâneo ao banco
- **Limites**: Timeouts, memória, payloads grandes

## Comandos de Teste

### Executar Todos os Testes
```bash
npm test
```

### Executar Testes em Modo Watch
```bash
npm run test:watch
```

### Executar com Relatório de Cobertura
```bash
npm run test:coverage
```

### Executar Testes para CI/CD
```bash
npm run test:ci
```

### Executar Apenas Testes Unitários
```bash
npm run test:unit
```

### Executar Apenas Testes de Integração
```bash
npm run test:integration
```

### Executar Teste Específico (stats.test.ts)
```bash
MONGO_URI=mongodb://localhost:27017/log-dashboard-test npm test -- --testPathPattern="stats.test.ts" --testTimeout=60000
```

**Resultado Esperado:**
```
✓ should load test environment (2 ms)
Stats Routes Unit Tests
  GET /stats/top-errors
    ✓ should return empty array when no errors exist (85 ms)
    ✓ should return top errors sorted by frequency (45 ms)
    ✓ should respect limit parameter (33 ms)
    ✓ should filter by date range (18 ms)
    ✓ should handle invalid limit parameter (10 ms)
    ✓ should handle limit parameter out of range (10 ms)
    ✓ should include sample messages and sources in response (18 ms)
  GET /stats/time-series
    ✓ should return empty array when no logs exist (12 ms)
    ✓ should return time series data grouped by hour (24 ms)
    ✓ should return time series data grouped by day (16 ms)
    ✓ should filter by date range (17 ms)
    ✓ should handle invalid bucket parameter (10 ms)
  GET /stats/levels
    ✓ should return empty array when no logs exist (12 ms)
    ✓ should return levels distribution with correct counts and percentages (20 ms)
    ✓ should filter by date range (15 ms)
    ✓ should handle percentage calculation with zero total (10 ms)
  Error Handling
    ✓ should handle malformed date parameters (9 ms)
    ✓ should handle missing query parameters gracefully (12 ms)

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Time:        1.917 s
```


### Executar Teste Específico (Log.test.ts)
```bash
MONGO_URI=mongodb://localhost:27017/log-dashboard-test npm test -- --testPathPattern="Log.test.ts" --testTimeout=60000
```

**Resultado Esperado:**
```
✓ should load test environment (2 ms)
Log Model
  Schema Validation
    ✓ should create a valid log entry (78 ms)
    ✓ should create a log entry without optional fields (12 ms)
    ✓ should reject invalid level values (8 ms)
    ✓ should reject missing required fields (5 ms)
    ✓ should reject missing timestamp (5 ms)
    ✓ should reject missing message (6 ms)
    ✓ should reject missing source (6 ms)
  Data Types
    ✓ should handle different log levels correctly (23 ms)
    ✓ should handle complex context objects (10 ms)
    ✓ should handle long messages (11 ms)
  Timestamps
    ✓ should automatically set createdAt and updatedAt (8 ms)
    ✓ should update updatedAt when document is modified (42 ms)
  Query Operations
    ✓ should find logs by level (38 ms)
    ✓ should find logs by source (13 ms)
    ✓ should find logs by error code (16 ms)
    ✓ should find logs by date range (15 ms)
    ✓ should sort logs by timestamp (22 ms)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        2.752 s
```

## Configuração de Ambiente

### Variáveis de Ambiente para Testes
```bash
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/log-dashboard-test
PORT=3001
LOG_LEVEL=error
```

### Banco de Dados de Teste
- **Nome**: `log-dashboard-test`
- **Limpeza**: Automática antes e depois de cada teste
- **Isolamento**: Cada teste roda em ambiente limpo

## Cobertura de Testes

### Thresholds Mínimos
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Relatórios Gerados
- **Terminal**: Resumo textual
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

## Estrutura dos Testes

### Setup e Teardown
```typescript
beforeAll(async () => {
  // Conectar ao banco de teste
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  // Limpar e desconectar
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Limpar dados antes de cada teste
  await Log.deleteMany({});
});
```

### Padrões de Teste
```typescript
describe('Feature Name', () => {
  it('should do something when condition is met', async () => {
    // Arrange
    const testData = { /* dados de teste */ };
    
    // Act
    const result = await functionUnderTest(testData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

## Mocks e Stubs

### SSH Service
- Mock completo do módulo `ssh2`
- Simulação de conexões SSH
- Testes de comandos remotos

### File System
- Mock do módulo `fs/promises`
- Simulação de operações de arquivo
- Testes de leitura/escrita

## Dados de Teste

### Logs de Exemplo
```typescript
const testLogs = [
  {
    timestamp: new Date(),
    level: 'error',
    message: 'Database connection failed',
    source: 'api-server',
    errorCode: 'DB_CONN_001',
    context: { userId: '123' }
  },
  // ... mais logs
];
```

### Cenários de Teste
- **Dados Válidos**: Logs com todos os campos obrigatórios
- **Dados Mínimos**: Logs apenas com campos obrigatórios
- **Dados Inválidos**: Logs com campos faltando ou inválidos
- **Dados Extremos**: Logs com valores muito grandes ou especiais

## Performance e Limites

### Testes de Performance
- **Grandes Volumes**: 10.000+ registros
- **Concorrência**: 10+ requisições simultâneas
- **Timeout**: Máximo 5 segundos por operação

### Limites Testados
- **Mensagens**: Até 100KB
- **Contextos**: Objetos complexos aninhados
- **Parâmetros**: Valores extremos e inválidos

## Troubleshooting

### Problemas Comuns

#### Timeout de Testes
```bash
# Aumentar timeout no jest.config.js
testTimeout: 30000
```

#### Conexão com MongoDB
```bash
# Verificar se MongoDB está rodando
mongosh --eval "db.runCommand('ping')"
```

#### Mocks Não Funcionando
```bash
# Limpar cache do Jest
npm test -- --clearCache
```

### Logs de Debug
```bash
# Executar com logs detalhados
DEBUG=* npm test
```

## Integração Contínua

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run lint
```

### Pré-commit Hooks
```bash
# Instalar husky para hooks
npm install --save-dev husky
npx husky add .husky/pre-commit "npm test"
```

## Métricas de Qualidade

### Cobertura por Módulo
- **Models**: 95%+ (validações críticas)
- **Routes**: 90%+ (APIs públicas)
- **Services**: 85%+ (lógica de negócio)
- **Utils**: 80%+ (funções auxiliares)

### Testes por Funcionalidade
- **Ingestão**: Validação, transformação, persistência
- **Consultas**: Filtros, agregações, paginação
- **SSH**: Conexão, comandos, download
- **APIs**: Parâmetros, respostas, erros

## Próximos Passos

### Melhorias Planejadas
1. **Testes E2E**: Cypress ou Playwright
2. **Load Testing**: Artillery ou k6
3. **Mutation Testing**: Stryker
4. **Visual Testing**: Screenshots de APIs

### Novos Cenários
1. **Falhas de Rede**: Simulação de desconexões
2. **Corrupção de Dados**: Recuperação de erros
3. **Escalabilidade**: Testes com milhões de registros
4. **Segurança**: Testes de vulnerabilidades
