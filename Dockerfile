FROM node:18-slim

WORKDIR /app/bot

COPY bot/package*.json ./

RUN npm install

COPY bot/ .

CMD ["npm", "start"]
