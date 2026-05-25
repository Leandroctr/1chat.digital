FROM node:18

WORKDIR /app/bot
COPY bot/ .

RUN npm install
CMD ["npm", "start"]
