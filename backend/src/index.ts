import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './lib/logger';
import statsRoutes from './routes/stats';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  logger.info({
    message: 'Request recebida',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rotas da API
app.use('/stats', statsRoutes);

// Middleware para tratar erros de parsing JSON
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.error({
      message: 'JSON malformado recebido',
      error: err.message,
      url: req.url,
      method: req.method,
    });

    res.status(400).json({
      success: false,
      error: 'JSON malformado',
    });
    return;
  }
  next(err);
});

// Middleware de tratamento de erros
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    message: 'Erro não tratado',
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
  });
});

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/log-dashboard';
    
    await mongoose.connect(mongoUri);
    
    logger.info({
      message: 'Conectado ao MongoDB',
      uri: mongoUri.replace(/\/\/.*@/, '//***:***@'), // Mascarar credenciais
    });

    // Índices são criados pelo init.js do MongoDB
    logger.info({
      message: 'Índices do MongoDB gerenciados pelo init.js',
    });

    logger.info({
      message: 'Índices do MongoDB criados/verificados',
    });

  } catch (error) {
    logger.error({
      message: 'Erro ao conectar ao MongoDB',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Em ambiente de teste, lançar o erro ao invés de fazer exit
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    
    process.exit(1);
  }
}

// Iniciar servidor
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    logger.info({
      message: 'Servidor iniciado',
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
  });
}

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({
    message: 'SIGTERM recebido, encerrando servidor',
  });
  
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({
    message: 'SIGINT recebido, encerrando servidor',
  });
  
  await mongoose.connection.close();
  process.exit(0);
});

// Iniciar aplicação apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error({
      message: 'Erro ao iniciar servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

// Exportar app e funções para testes
export { app, connectToDatabase };
