
FROM node:22-alpine

WORKDIR /app

COPY services/auth-service/package*.json ./

RUN npm ci --omit=dev

COPY services/auth-service/src ./src

COPY shared /shared

EXPOSE 3001 50051

CMD ["node", "src/server.js"]
