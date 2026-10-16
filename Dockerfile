FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./server.js
COPY views ./views
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]
