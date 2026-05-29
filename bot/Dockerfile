FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data logs

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
