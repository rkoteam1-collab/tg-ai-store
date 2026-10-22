FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
ARG VITE_BACKUP_URL
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
  && mkdir -p /data /backup \
  && chown node:node /data /backup
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node scripts ./scripts
USER node
EXPOSE 3000
CMD ["node","server/index.js"]
