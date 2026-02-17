# services/api/Dockerfile
# Multi-stage build for oli-api from monorepo root.
# Cloud Build context MUST be repo root (.), because we rely on the workspace lockfile.

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Root manifests (workspace install) — REQUIRED for deterministic builds.
COPY package.json package-lock.json ./

# Workspace manifests that influence dependency graph
COPY services/api/package.json ./services/api/package.json
COPY lib/contracts/package.json ./lib/contracts/package.json

# Deterministic install (fail-closed if lockfile is missing or inconsistent)
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build workspace deps needed at runtime (fail-closed)
WORKDIR /app/lib/contracts
RUN npm run build && test -f dist/index.js && test -f dist/index.d.ts

# Build the API and fail-closed if the entrypoint is missing
WORKDIR /app/services/api
RUN npm run build && test -f dist/src/server.js

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# API runtime artifacts
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/package.json ./services/api/package.json

# Monorepo workspace runtime deps (prevents MODULE_NOT_FOUND for @oli/contracts)
COPY --from=build /app/lib/contracts/dist ./lib/contracts/dist
COPY --from=build /app/lib/contracts/package.json ./lib/contracts/package.json

# Node modules (workspace symlinks now have real targets in /app/lib/contracts)
COPY --from=deps /app/node_modules ./node_modules

WORKDIR /app/services/api
CMD ["node", "dist/src/server.js"]
