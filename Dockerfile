# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (használj npm install, mert nincs package-lock.json)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the frontend
RUN npm run build

# Compile TypeScript server to JavaScript
RUN npx tsc server.ts --outDir dist --module commonjs --esModuleInterop --resolveJsonModule --skipLibCheck

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy necessary runtime files
COPY prisma ./prisma
COPY services ./services

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose ports
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application (run compiled JavaScript)
CMD ["node", "dist/server.js"]
