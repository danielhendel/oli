# Root Dockerfile (Option A)
# Builds & runs Cloud Run API from repo root using npm workspaces.
# Deterministic, cache-friendly, no vendoring hacks.

FROM node:20-slim AS deps
WORKDIR /app

RUN npm --version && npm install -g npm@11.8.0 && npm --version

# Copy only manifests first for maximum Docker cache hit rate
COPY package.json package-lock.json ./
COPY lib/contracts/package.json lib/contracts/package.json
COPY services/api/package.json services/api/package.json
COPY services/functions/package.json services/functions/package.json

# Deterministic install at repo root (creates workspace links in node_modules)
# Ignore scripts to prevent lifecycle builds before sources are copied.
RUN npm ci --no-audit --no-fund --ignore-scripts

FROM node:20-slim AS build
WORKDIR /app
RUN npm install -g npm@11.8.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build order matters: contracts must emit dist/ before api compiles against it.
# IMPORTANT: wipe BOTH output + the actual incremental buildinfo that lands under dist/
RUN rm -rf lib/contracts/dist || true
RUN rm -f lib/contracts/dist/tsconfig.tsbuildinfo || true
RUN npm run -w @oli/contracts build

RUN rm -rf services/api/dist || true
RUN rm -f services/api/dist/tsconfig.tsbuildinfo || true
RUN npm run -w api build

# Build-time assertions: fail image build if critical routes are missing in compiled artifact.
RUN node scripts/ci/assert-api-routes.mjs

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN npm install -g npm@11.8.0

# Copy the pieces runtime needs
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/package.json
COPY lib/contracts/package.json lib/contracts/package.json
COPY --from=build /app/lib/contracts/dist ./lib/contracts/dist
COPY --from=build /app/services/api/dist ./services/api/dist

# Install production dependencies for the API workspace (guarantees pubsub exists)
# This uses the root lockfile deterministically.
RUN npm ci -w api --omit=dev --no-audit --no-fund --ignore-scripts

EXPOSE 8080
CMD ["node", "services/api/dist/src/server.js"]