# services/normalizer/Dockerfile
# ---------- Build stage ----------
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # Install all deps (no lockfile present)
    COPY package.json ./
    RUN npm install
    
    # Build TypeScript
    COPY . .
    RUN npm run build
    
    # ---------- Runtime stage (keep full node for stability/logs) ----------
    FROM node:20-alpine
    WORKDIR /app
    ENV NODE_ENV=production
    # Copy built app and all node_modules (no pruning)
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/node_modules ./node_modules
    
    # Helpful: show logs immediately if something fails
    CMD ["node", "dist/index.js"]
      