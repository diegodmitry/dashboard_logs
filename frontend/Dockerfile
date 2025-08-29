FROM node:18-alpine as build

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Stage de produção
FROM nginx:alpine

# Copiar build do React
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Comando para iniciar
CMD ["nginx", "-g", "daemon off;"]
