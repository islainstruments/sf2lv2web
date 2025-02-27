FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build -- --skipLibCheck

FROM node:18 AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:18

WORKDIR /app/backend

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Create public directory and copy frontend
RUN mkdir -p public
COPY --from=frontend-builder /app/frontend/dist ./public

# Create necessary directories
RUN mkdir -p ./plugins/uploads ./plugins/temp

# Copy worklet processor
COPY frontend/public/worklet_processor.min.js ./public/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DEBUG=express:*

# Health check
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start command
CMD echo 'Starting server...' && node dist/index.js 