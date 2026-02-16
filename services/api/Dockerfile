# ---------- Builder: installs dev deps and compiles ----------
    FROM node:20-slim AS builder
    WORKDIR /srv
    
    # Copy manifest first for better caching
    COPY package*.json ./
    RUN npm ci
    
    # Copy sources and build
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    
    # ---------- Runtime: prod-only, minimal image ----------
    FROM node:20-slim
    ENV NODE_ENV=production
    WORKDIR /srv
    
    # Only prod deps
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Bring compiled output from builder
    COPY --from=builder /srv/dist ./dist
    
    # Runtime env and start
    ENV PORT=8080
    EXPOSE 8080
    CMD ["node", "dist/index.js"]
    