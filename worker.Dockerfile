# Multi-stage Dockerfile for running Orbstera background worker
# Node.js 22 alpine for light bundle and compatibility
FROM node:22-alpine AS base

WORKDIR /app

# Install build dependencies (for native modules if any)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

# Install all dependencies
RUN npm ci

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

# Copy node_modules and base app
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Set default env variables for the container
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# The worker process is run via tsx wrapper or compiled JS
# Running via the defined npm script: npm run worker
CMD ["npm", "run", "worker"]
