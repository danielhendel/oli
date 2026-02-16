# ---------- Build stage ----------
    FROM node:20-alpine AS build
    WORKDIR /app
    
    COPY package.json ./
    RUN npm install
    
    COPY . .
    RUN npm run build
    RUN npm prune --omit=dev
    
    # ---------- Runtime stage ----------
    FROM gcr.io/distroless/nodejs20-debian12
    WORKDIR /app
    ENV NODE_ENV=production
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/node_modules ./node_modules
    CMD ["dist/index.js"]
    