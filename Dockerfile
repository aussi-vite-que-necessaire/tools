# Use pre-built base image with Node.js and Chromium
FROM ghcr.io/aussi-vite-que-necessaire/tools/tools-api-base:latest

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for building TypeScript
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Expose port
EXPOSE 3000

# Set non-root user for security
# Use existing user with UID 1000 or create one if it doesn't exist
RUN if id -u 1000 > /dev/null 2>&1; then \
      EXISTING_USER=$(getent passwd 1000 | cut -d: -f1); \
      chown -R $EXISTING_USER:$EXISTING_USER /app; \
    else \
      useradd -m -u 1000 appuser && chown -R appuser:appuser /app; \
    fi
USER 1000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

