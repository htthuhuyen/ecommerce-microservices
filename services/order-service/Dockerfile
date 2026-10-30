
FROM node:22-alpine

WORKDIR /app/services/order-service

COPY services/order-service/package*.json ./

RUN npm ci --omit=dev

COPY services/order-service/src ./src

COPY shared /app/shared

EXPOSE 3004 50054

CMD ["node", "src/server.js"]
