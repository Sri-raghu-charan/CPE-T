# ==============================================================================
# CPET Backend Production Multi-Stage Dockerfile
# Node.js 20 Alpine - Production Hardened
# ==============================================================================

# Stage 1: Base Dependencies & Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials for native dependencies if required
RUN apk add --no-cache python3 make g++

# Copy root workspace configurations
COPY package.json package-lock.json ./
COPY database/package.json ./database/
COPY backend/package.json ./backend/

# Install all dependencies including devDependencies for compilation
RUN npm ci

# Copy database source and compile
COPY database/ ./database/
RUN npm run build --workspace=database

# Copy backend source and compile
COPY backend/ ./backend/
RUN npm run build --workspace=backend

# Prune dev dependencies for production footprint
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Run with non-root node user for container security
USER node

# Environment defaults
ENV NODE_ENV=production \
    PORT=5000

# Copy node_modules and built packages from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/database/package.json ./database/package.json
COPY --chown=node:node --from=builder /app/database/dist ./database/dist
COPY --chown=node:node --from=builder /app/backend/package.json ./backend/package.json
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "backend/dist/server.js"]
