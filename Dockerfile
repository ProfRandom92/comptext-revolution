# Multi-stage build for CompText Revolution MCP Server

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build all packages
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Create session data directory
RUN mkdir -p /data/sessions && chmod 777 /data/sessions

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Set environment
ENV NODE_ENV=production
ENV COMPTEXT_DB_PATH=/data/sessions/comptext.db

# Expose MCP server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

# Start MCP server
CMD ["node", "packages/mcp-server/dist/index.js"]
