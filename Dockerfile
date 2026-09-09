FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:standalone
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 FITSPACE_DATA_DIR=/app/data
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node","standalone/server.mjs"]
