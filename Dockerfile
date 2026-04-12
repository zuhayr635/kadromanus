# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN pnpm run build

# Production stage
FROM node:22-alpine

# Chromium for Puppeteer screenshots
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app

# Copy node_modules from builder (faster and includes patches)
COPY --from=builder /app/node_modules ./node_modules

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/index.js"]
