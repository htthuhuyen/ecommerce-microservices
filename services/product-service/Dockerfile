
FROM node:22-alpine

WORKDIR /app

COPY services/product-service/package*.json ./

RUN npm ci --omit=dev

COPY services/product-service/src ./src

COPY shared /shared

EXPOSE 3003 50053

CMD ["node", "src/server.js"]
