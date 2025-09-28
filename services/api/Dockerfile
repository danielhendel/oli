# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# If you don't have package-lock.json, change this to: RUN npm install
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# If you don't have package-lock.json, change this to: RUN npm install --omit=dev
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
