FROM node:18-bullseye

# Instalar dependências do sistema para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxrandr2 \
    libgconf-2-4 \
    libnss3 \
    libgbm1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdbus-1-3 \
    libcairo2 \
    libcups2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

EXPOSE 3000

WORKDIR /app/bot
CMD npm install && npm start
