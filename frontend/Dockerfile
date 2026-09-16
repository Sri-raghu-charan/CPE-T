# ==============================================================================
# CPET Frontend Production Multi-Stage Dockerfile
# Nginx Alpine - High Performance Static Server & Reverse Proxy
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and frontend manifests
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install build dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./frontend/

# Build static bundle with Vite
RUN npm run build --workspace=frontend

# Stage 2: Nginx Web Server
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
