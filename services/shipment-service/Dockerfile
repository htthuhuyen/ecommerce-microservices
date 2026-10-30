
FROM node:22-alpine

WORKDIR /app/services/shipment-service

COPY services/shipment-service/package*.json ./

RUN npm ci --omit=dev

COPY services/shipment-service/src ./src

COPY shared /app/shared

EXPOSE 3005 50055

CMD ["node", "src/server.js"]
