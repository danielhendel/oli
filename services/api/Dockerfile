# services/api/Dockerfile
# Cloud Run build context: services/api

FROM node:20-slim AS deps
WORKDIR /app

# Pin npm to avoid Cloud Build/npm crashes
RUN npm --version \
  && npm install -g npm@11.8.0 \
  && npm --version

COPY package.json package-lock.json ./

# Deterministic install
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS build
WORKDIR /app

RUN npm install -g npm@11.8.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TS -> dist/*
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./package.json

# Make @oli/contracts resolvable at runtime
RUN mkdir -p node_modules/@oli/contracts \
  && cp -R dist/lib/contracts/* node_modules/@oli/contracts/ \
  && printf '{\n  "name": "@oli/contracts",\n  "private": true,\n  "main": "index.js"\n}\n' > node_modules/@oli/contracts/package.json

EXPOSE 8080
CMD ["node", "dist/src/server.js"]
