# 1. 2026 Node Environment with Built-in Chrome Dependencies
FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root
WORKDIR /app

# 2. Project Configurations Copying Matrix
COPY package.json ./
RUN npm install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
