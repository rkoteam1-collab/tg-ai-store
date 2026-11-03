FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV FRONTEND_BASE=/
ENV VITE_API_BASE_URL=
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data/store
WORKDIR /app
RUN addgroup -S shop && adduser -S shop -G shop && mkdir -p /data/store && chown -R shop:shop /data
COPY --from=build --chown=shop:shop /app/node_modules ./node_modules
COPY --from=build --chown=shop:shop /app/package.json ./package.json
COPY --from=build --chown=shop:shop /app/server ./server
COPY --from=build --chown=shop:shop /app/shared ./shared
COPY --from=build --chown=shop:shop /app/dist ./dist
USER shop
EXPOSE 3000
CMD ["node", "server/index.js"]
