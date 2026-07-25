FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh


ENV NODE_ENV=production

EXPOSE 8081

ENTRYPOINT ["./entrypoint.sh"]