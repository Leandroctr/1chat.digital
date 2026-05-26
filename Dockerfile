FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY bot/package*.json ./

RUN npm install

COPY bot/ .

CMD ["node", "bot.js"]
