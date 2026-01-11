# services/api/Dockerfile
# IMPORTANT: This Dockerfile must be built with the REPO ROOT as the build context.
# Example (repo root):
#   docker build -f services/api/Dockerfile .
# or (Cloud Build):
#   gcloud builds submit -f services/api/Dockerfile .

FROM node:20-slim AS deps
WORKDIR /workspace

# Install from repo root so dependency graph matches local
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules

# The API tsconfig extends ../../tsconfig.base.json and includes ../../lib/contracts/**
# So we must bring those into /workspace for the build.
COPY tsconfig.base.json ./
COPY lib/contracts ./lib/contracts
COPY services/api ./services/api

# Build API
WORKDIR /workspace/services/api
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

# Include node_modules (firebase-admin, etc.)
COPY --from=deps /workspace/node_modules ./node_modules

# Compiled output contains dist/services/api/src/* because rootDir is repo root (../..)
COPY --from=build /workspace/services/api/dist ./dist

# Optional (nice for metadata/tools)
COPY --from=build /workspace/services/api/package.json ./package.json

EXPOSE 8080
CMD ["node", "dist/services/api/src/server.js"]
