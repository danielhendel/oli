# ---- Build stage ----
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # Install deps (requires package-lock.json). If you don't have it, use: RUN npm install
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
    # If you don't have package-lock.json, use: RUN npm install --omit=dev
    RUN npm ci --omit=dev --ignore-scripts
    
    # Bring compiled JS
    COPY --from=build /app/dist ./dist
    
    # Cloud Run conventions
    ENV PORT=8080
    EXPOSE 8080
    
    CMD ["node", "dist/index.js"]
    