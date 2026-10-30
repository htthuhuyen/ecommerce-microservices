
FROM node:22-alpine

WORKDIR /app

COPY services/customer-service/package*.json ./

RUN npm ci --omit=dev

COPY services/customer-service/src ./src

COPY shared /shared

EXPOSE 3002 50052

CMD ["node", "src/server.js"]
