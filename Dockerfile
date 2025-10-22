# Build stage
FROM node:24-slim AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source files needed for build
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

# Build the TypeScript source
RUN npm run build

# Production stage
FROM node:24-slim

WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --chown=node:node --from=builder /usr/src/app/build ./build

# Create generated directory
RUN mkdir -p generated && chown -R node:node generated

# Switch to non-root user
USER node

# Expose port (can be overridden by PORT env var)
EXPOSE 3000

# Run the app
CMD [ "node", "build/index.js" ]
