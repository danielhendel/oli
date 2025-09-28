# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (only re-run when package files change)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled app from build stage
COPY --from=build /app/dist ./dist

# Cloud Run will set $PORT; ensure your server listens on it.
EXPOSE 8080
CMD ["node", "dist/index.js"]
