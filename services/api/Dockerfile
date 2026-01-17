# services/api/Dockerfile
# Built with build context = services/api (Cloud Run --source services/api)

FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TS -> dist/*
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

# Bring runtime deps
COPY --from=deps /app/node_modules ./node_modules

# Bring compiled output
COPY --from=build /app/dist ./dist
COPY package.json ./package.json

# --- IMPORTANT ---
# Make the TS path alias "@oli/contracts" resolvable at runtime.
# We vendor the compiled contracts into node_modules/@oli/contracts so that:
#   require("@oli/contracts")
#   require("@oli/contracts/day")
# etc. all work in plain Node.
RUN mkdir -p node_modules/@oli/contracts \
  && cp -R dist/lib/contracts/* node_modules/@oli/contracts/ \
  && printf '{\n  "name": "@oli/contracts",\n  "private": true,\n  "main": "index.js"\n}\n' > node_modules/@oli/contracts/package.json

EXPOSE 8080
CMD ["node", "dist/src/server.js"]
