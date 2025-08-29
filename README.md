# Log Dashboard

Dashboard de logs com backend Node.js/Express e frontend React para visualização de estatísticas de logs.

## 🚀 Funcionalidades

- **Backend**: API REST com Node.js, Express e TypeScript
- **Frontend**: Dashboard React com gráficos Plotly
- **Banco**: MongoDB com TTL de 10 dias
- **SSH**: Fetch remoto de logs via SSH
- **Docker**: Containerização completa com Docker Compose

## 📋 Pré-requisitos

- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)
- MongoDB (opcional para desenvolvimento local)

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd log-dashboard
```

### 2. Configure as variáveis de ambiente

**Backend** (`backend/env.example` → `backend/.env`):
```env
MONGO_URI=mongodb://mongo:27017/log-dashboard
PORT=3000
NODE_ENV=development
SSH_HOST=your-remote-server.com
SSH_USER=your-username
SSH_PORT=22
SSH_KEY_PATH=/path/to/your/private/key
SSH_TIMEOUT=15000
LOG_LEVEL=info
```

**Frontend** (`frontend/env.example` → `frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Execute com Docker Compose
```bash
cd docker
docker compose up -d
```

## 🏃‍♂️ Uso

### URLs de Acesso
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081 (admin/admin123)

### Comandos Úteis

```bash
# Ver logs dos containers
docker compose logs -f

# Parar todos os serviços
docker compose down

# Rebuild das imagens
docker compose up -d --build

# Acessar MongoDB
docker compose exec mongo mongosh log-dashboard

# Executar scripts do backend
docker compose exec api npm run seed:logs
docker compose exec api npm run ingest
```

## 📊 Endpoints da API

### Health Check
- `GET /health` - Status da aplicação

### Estatísticas
- `GET /stats/top-errors?from=&to=&limit=10` - Top erros
- `GET /stats/time-series?bucket=hour|day&from=&to=` - Série temporal
- `GET /stats/levels?from=&to=` - Distribuição por níveis

## 🧪 Desenvolvimento Local

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Estrutura do Projeto

```
log-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/Log.ts          # Modelo MongoDB com TTL
│   │   ├── services/
│   │   │   ├── logIngest.ts       # Ingestão com validação Zod
│   │   │   └── sshFetch.ts        # Fetch remoto via SSH
│   │   ├── routes/stats.ts        # Endpoints da API
│   │   ├── lib/logger.ts          # Logger JSON (Pino)
│   │   └── index.ts               # Servidor Express
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/Dashboard.tsx    # Página principal
│   │   ├── components/charts/     # Componentes de gráficos
│   │   ├── api/client.ts          # Cliente da API
│   │   └── hooks/useStats.ts      # Hooks SWR
│   ├── Dockerfile
│   └── package.json
├── docker/
│   ├── docker-compose.yml         # Orquestração
│   └── mongo-init/init.js         # Script de inicialização
└── reports/sql/                   # Queries SQL de exemplo
```

## 🔧 Configuração SSH

1. Gere uma chave SSH:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/log-dashboard
```

2. Configure a chave no servidor remoto:
```bash
ssh-copy-id -i ~/.ssh/log-dashboard.pub user@remote-server
```

3. Defina permissões:
```bash
chmod 600 ~/.ssh/log-dashboard
```

4. Configure no `.env`:
```env
SSH_KEY_PATH=/home/user/.ssh/log-dashboard
```

## 📈 Gráficos Disponíveis

1. **Top Errors**: Gráfico de barras dos erros mais frequentes
2. **Levels Distribution**: Gráfico de pizza da distribuição por níveis
3. **Time Series**: Gráfico de linha com série temporal

## 🔒 Segurança

- Nunca commite arquivos `.env` ou chaves SSH
- Use HTTPS em produção
- Configure firewall adequadamente
- Rotacione chaves SSH regularmente

## 🐛 Troubleshooting

### MongoDB não conecta
```bash
docker compose logs mongo
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

### API não responde
```bash
docker compose logs api
curl http://localhost:3000/health
```

### Frontend não carrega
```bash
docker compose logs web
curl http://localhost:5173
```

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.
