# Single-container build: the Vite frontend and the NestJS API ship together and are
# served from one origin. Every backend route carries an /api prefix, so the API and the
# SPA can share a hostname without a reverse proxy in front of them.

# --- Stage 1: build the React app -------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: build the NestJS API ------------------------------------------------
FROM node:20-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build
# Drop dev dependencies once the build is done — nest/ts-node/jest are not needed at
# runtime and roughly halve the final image.
RUN npm prune --omit=dev

# --- Stage 3: runtime -------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
# Migrations travel with the image so they can be run against the deployed database.
COPY --from=backend /app/backend/db ./db
# main.ts serves this directory for any path that isn't /api or /docs.
COPY --from=frontend /app/dist ./public
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/main.js"]
