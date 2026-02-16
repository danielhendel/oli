FROM node:20-slim
WORKDIR /srv
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["npm","start"]
