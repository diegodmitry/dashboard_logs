FROM node:18-alpine

WORKDIR /app

# Instalar dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar
CMD ["npm", "start"]
