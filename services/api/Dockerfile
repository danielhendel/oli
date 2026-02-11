# Cloud Run API — Node 20, npm workspaces (@oli/contracts + api), patch-package, PORT=8080
# Build: docker build -f services/api/Dockerfile -t oli-api-local .
# Run:  docker run --rm -e PORT=8080 -p 8080:8080 oli-api-local
# Check: curl http://localhost:8080/healthz

FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Root and patches (patch-package runs in postinstall)
COPY package.json package-lock.json ./
COPY patches ./patches

# Workspaces: contracts and api (full); functions only package.json so workspace resolution succeeds
COPY lib/contracts ./lib/contracts
COPY services/api ./services/api
COPY services/functions/package.json ./services/functions/package.json

RUN npm ci

RUN npm run -w @oli/contracts build && npm run -w api build

# Production image: keep only runtime deps and built output
FROM node:20-bookworm-slim

WORKDIR /app

ENV PORT=8080
ENV NODE_ENV=production

# Copy root package files and patches for runtime require resolution
COPY package.json package-lock.json ./
COPY patches ./patches
COPY lib/contracts ./lib/contracts
COPY services/api/package.json services/api/tsconfig.json ./services/api/
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/lib/contracts/dist ./lib/contracts/dist
COPY services/functions/package.json ./services/functions/package.json

# Use builder node_modules (patches already applied by postinstall) and drop devDependencies
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

# API entrypoint (uses built dist)
WORKDIR /app/services/api
CMD ["node", "dist/src/server.js"]
