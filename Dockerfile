FROM node:18-alpine

RUN apk add --no-cache git

COPY bot/package*.json ./

RUN npm install

COPY bot/ .

CMD ["npm", "start"]
