# services/api/Dockerfile
# Multi-stage build for oli-api from monorepo root.
# Cloud Build context is repo root (.), per scripts/deploy-api-strategy-b.sh.

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Root manifests (workspace install)
COPY package.json package-lock.json ./

# Workspace manifests that influence dependency graph
COPY services/api/package.json ./services/api/package.json
COPY lib/contracts/package.json ./lib/contracts/package.json

RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the API and fail-closed if the entrypoint is missing
WORKDIR /app/services/api
RUN npm run build && test -f dist/src/server.js

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=deps /app/node_modules ./node_modules

WORKDIR /app/services/api
CMD ["node", "dist/src/server.js"]
