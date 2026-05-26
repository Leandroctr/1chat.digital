FROM node:20-slim

WORKDIR /app

# Copia package.json
COPY backend/package.json .

# Instala dependências
RUN npm install

# Copia TUDO do backend
COPY backend/server.js .
COPY backend/.env .

# Porta
EXPOSE 3000

# Inicia
CMD ["node", "server.js"]
