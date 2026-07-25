FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN sed -i 's/\r$//' /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

ENV NODE_ENV=production

EXPOSE 8081

ENTRYPOINT ["/app/entrypoint.sh"]