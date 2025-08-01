# Use official Node.js LTS (Long Term Support) image
FROM node:18-alpine

# Metadata labels
LABEL maintainer="DocuSign Worker API" \
      version="1.0.0" \
      description="DocuSign eSignature API Worker with comprehensive envelope management"

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S docusign -u 1001

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies (production only, with clean cache)
RUN npm ci --only=production --audit --fund=false && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Copy application code
COPY server.js test-docusign.js ./

# Copy documentation (useful for API users)
COPY SETUP.md grant-consent-guide.md API_REFERENCE.md ENVELOPE_OPERATIONS.md ./

# Create uploads directory and set permissions
RUN mkdir -p uploads && \
    chown -R docusign:nodejs /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# DocuSign configuration (these can be overridden at runtime)
ENV DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# Required environment variables (no defaults for security)
# These must be provided at runtime:
# - DOCUSIGN_INTEGRATION_KEY
# - DOCUSIGN_USER_ID  
# - DOCUSIGN_ACCOUNT_ID
# - DOCUSIGN_PRIVATE_KEY

# Expose port
EXPOSE ${PORT}

# Switch to non-root user
USER docusign

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) { console.log('Health check passed'); process.exit(0); } \
        else { console.log('Health check failed'); process.exit(1); } \
    }); \
    req.on('error', () => { console.log('Health check failed'); process.exit(1); }); \
    req.on('timeout', () => { console.log('Health check timeout'); process.exit(1); }); \
    req.end();"

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]