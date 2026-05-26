FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm --prefix backend install

EXPOSE 3000

CMD ["node", "backend/server.js"]
