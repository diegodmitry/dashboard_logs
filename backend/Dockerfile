FROM node:18-alpine

WORKDIR /app

# Instalar todas as dependências (incluindo devDependencies para build)
COPY package*.json ./
RUN npm ci

# Copiar código fonte (node_modules é ignorado pelo .dockerignore)
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover devDependencies para reduzir tamanho da imagem
RUN npm prune --production

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar com trace de warnings
CMD ["node", "--trace-warnings", "dist/index.js"]
