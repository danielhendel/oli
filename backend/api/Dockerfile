# --- Build stage ---
    FROM node:20-alpine AS build
    WORKDIR /srv
    
    # Install deps using lockfile if present
    COPY package.json package-lock.json* ./
    RUN npm ci || npm install
    
    # Build
    COPY tsconfig.json ./
    COPY . .
    RUN npm run build
    
    # --- Runtime (distroless) ---
    FROM gcr.io/distroless/nodejs20-debian12
    WORKDIR /srv
    ENV NODE_ENV=production
    
    # Bring runtime deps + built JS into final image
    COPY --from=build /srv/node_modules ./node_modules
    COPY --from=build /srv/package.json ./package.json
    COPY --from=build /srv/dist ./dist
    
    # Start compiled entrypoint
    CMD ["/srv/dist/index.js"]
    