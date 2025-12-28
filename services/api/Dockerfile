# services/api/Dockerfile

FROM node:20-slim AS deps
WORKDIR /workspace

# Install from repo root so workspace has the same dependency graph as local
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules

# Copy only what the API build needs
COPY tsconfig.json tsconfig.base.json tsconfig.*.json ./
COPY lib ./lib
COPY services/api ./services/api

# Build API
WORKDIR /workspace/services/api
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

# Compiled output contains dist/services/api/src/* because rootDir is repo root
COPY --from=build /workspace/services/api/dist ./dist

# Optional (nice for metadata/tools)
COPY --from=build /workspace/services/api/package.json ./package.json

EXPOSE 8080

# Start the real server entrypoint (your server.ts already exists and is correct)
CMD ["node", "dist/services/api/src/server.js"]
