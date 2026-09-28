# Stage 1: Build React App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY frontend/package.json .

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ .

# Inject production API URL configuration
ENV VITE_API_URL=/api

# Build static bundle
RUN npm run build

# Stage 2: Serve React App using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration to support client-side routing fallback
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
