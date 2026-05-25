FROM ghcr.io/puppeteer/puppeteer:22.6.0

WORKDIR /app/bot

COPY bot/package*.json ./

RUN npm ci

COPY bot/ .

CMD ["npm", "start"]
