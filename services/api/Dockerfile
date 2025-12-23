# ---- Build stage ----
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # Install deps (requires package-lock.json)
    COPY package*.json ./
    RUN npm ci --ignore-scripts
    
    # Build TypeScript
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    
    # ---- Runtime stage ----
    FROM node:20-alpine
    ENV NODE_ENV=production
    WORKDIR /app
    
    # Install only prod deps
    COPY package*.json ./
    RUN npm ci --omit=dev --ignore-scripts
    
    # Bring compiled JS
    COPY --from=build /app/dist ./dist
    
    # Cloud Run conventions
    ENV PORT=8080
    EXPOSE 8080
    
    # IMPORTANT: server.js is the entry that actually listens on PORT
    CMD ["node", "dist/server.js"]
    