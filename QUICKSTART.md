# 🚀 Quick Start - Log Dashboard

Guia rápido para executar o projeto log-dashboard.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Portas 3000, 5173, 27017, 8081 disponíveis

## ⚡ Execução Rápida

### 1. Clone e configure
```bash
git clone <repository-url>
cd log-dashboard
```

### 2. Configure variáveis de ambiente (opcional)
```bash
# Backend
cp backend/env.example backend/.env
# Edite backend/.env se necessário

# Frontend  
cp frontend/env.example frontend/.env
# Edite frontend/.env se necessário
```

### 3. Execute com Docker
```bash
cd docker
docker compose up -d
```

### 4. Acesse as aplicações
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000/health
- **MongoDB Express**: http://localhost:8081 (admin/admin123)

## 🧪 Teste Rápido

### 1. Verificar se tudo está funcionando
```bash
# Health check da API
curl http://localhost:3000/health

# Ver logs dos containers
docker compose logs -f
```

### 2. Popular com dados de exemplo
```bash
# Executar seed de logs
docker compose exec api npm run seed:logs

# Verificar dados no MongoDB
docker compose exec mongo mongosh log-dashboard --eval "db.logs.countDocuments()"
```

### 3. Testar endpoints
```bash
# Top errors
curl "http://localhost:3000/stats/top-errors?limit=5"

# Levels distribution
curl "http://localhost:3000/stats/levels"

# Time series
curl "http://localhost:3000/stats/time-series?bucket=hour"
```

## 🔧 Comandos Úteis

```bash
# Parar todos os serviços
docker compose down

# Rebuild das imagens
docker compose up -d --build

# Ver logs específicos
docker compose logs api
docker compose logs web
docker compose logs mongo

# Acessar container
docker compose exec api sh
docker compose exec mongo mongosh log-dashboard

# Executar testes
docker compose exec api npm test
```

## 🐛 Troubleshooting

### Problema: Containers não iniciam
```bash
# Verificar se as portas estão livres
lsof -i :3000
lsof -i :5173
lsof -i :27017

# Verificar logs de erro
docker compose logs
```

### Problema: API não responde
```bash
# Verificar se MongoDB está rodando
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Verificar logs da API
docker compose logs api
```

### Problema: Frontend não carrega
```bash
# Verificar se API está acessível
curl http://localhost:3000/health

# Verificar logs do frontend
docker compose logs web
```

## 📊 Estrutura dos Dados

### Formato de Log
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "source": "api-server",
  "errorCode": "DB_CONN_001",
  "context": {
    "retryCount": 3,
    "timeout": 5000
  }
}
```

### Níveis de Log
- `error`: Erros críticos
- `warn`: Avisos
- `info`: Informações
- `debug`: Debug

## 🔒 Segurança

- Nunca commite arquivos `.env`
- Configure chaves SSH adequadamente
- Use HTTPS em produção
- Rotacione credenciais regularmente

## 📈 Próximos Passos

1. Configure SSH para logs remotos
2. Adicione autenticação
3. Configure alertas
4. Implemente backup automático
5. Adicione mais gráficos e métricas

---

**🎉 Pronto!** Seu dashboard de logs está funcionando!
