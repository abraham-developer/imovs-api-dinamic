# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install sqlite3 dependencies required by Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set DATABASE_URL for build-time Prisma operations
ENV DATABASE_URL="file:/app/data/custom.db"
ENV NODE_ENV="production"

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app (standalone output)
RUN npx next build

# Copy static assets and public folder into standalone output
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# Ensure data directory exists
RUN mkdir -p /app/standalone/data

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl sqlite-libs

WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV DATABASE_URL="file:/app/data/custom.db"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/standalone ./

# Copy Prisma schema for runtime (generate if needed)
COPY --from=builder /app/prisma ./prisma

# Copy node_modules for Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Ensure data directory exists with proper permissions
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Create database on first run (will create file if not exists)
RUN npx prisma db push --skip-generate 2>/dev/null || true

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
