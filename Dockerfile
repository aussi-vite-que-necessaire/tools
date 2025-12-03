# Use Node.js 20 slim as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Puppeteer/Chromium
# These are essential for running Chromium in a headless environment
# Note: chromium-sandbox is included in chromium package on Debian
# libasound2t64 is Ubuntu-specific, on Debian we use libasound2
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
# Skip downloading Chromium (we use system Chromium)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Try to find chromium executable (chromium or chromium-browser)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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

# Set non-root user for security (optional but recommended)
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

