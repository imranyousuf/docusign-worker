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

# DocuSign configuration (hardcoded for convenience)
ENV DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
ENV DOCUSIGN_INTEGRATION_KEY=7febc2b8-e2ef-4052-84f7-511d4d1182f3
ENV DOCUSIGN_USER_ID=96eac68b-10d6-4489-92a3-e61f90da3261
ENV DOCUSIGN_ACCOUNT_ID=fdc4aff1-0429-4c1b-aaa3-9f870e538769
ENV DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAlwQV4SfQlqmj0g1A30/UgwDYFWwgFLsn50C5ZXQfL6RURy45\n9gR8AGNC61slQsJlrBuIcqA1dT0iNCLVH0dXSVrB9do57TH6UWxmX1zpMUvwfOMF\n2Kqrl+QJJmmT5FIw0xihYtqX1pZE9eqiEqm0EPvtIEX8jECxkFMI94uZcEaFSsWX\nQTqjF8NPnWDrbx1U64r9o+/JAQ07NLF7iMPJxCaBMFI0A1zP6sTvezLekWTwOQN4\n8DXvns9BF9zaXsbsojE9G98WKaWZWJVVkYqzSzOmk4sNNAYL2z8OfzWyecQPHQsX\nLiumFfyAYgiUlLEMsOMcq5kn2kmAeGIs9lAayQIDAQABAoIBAApsscX1JaUA2Nor\nKAtCS30vlbsE18IWmU6RXTrvpSd4xIiVXFLrRFQShhARHqVZHgOfcu/Wt1n8elv2\n+5dJKXFa3oDGK7F//bOZNAfpNf+9KkC0uzaVsXqutyL7rsXYFp672IgmZszdWq1P\nIRkAtflmKpxLuH9GB/vaf4f3DwR8/i+qiRYW8G1cLVDAkl7E50EF1tGI+nJrlaf9\nwt2UxFz0wePW29OgdN7JUoXxkvk9ZXn1k7GA+Ei4XupO+egRDuUolVPU3jHRoYUV\nc9vTs9XCbnaQn1kDGyoUMGIsD83yKLPu92NyJtp46/2Dbv+NIvMjWrl0xOPnTzLU\nhtBNH8ECgYEA6gAPqk0zBoq0jI2ecVYPmIivhQpkIs4o3PMQ6MmcPkGoshSIvf1+\naHaCBD8hlja1YNnLnSpffvFIQo8STKW1wV7pbJFIfF9xItKKd65NdOPoeXXhCnSP\nUbCw1hCR3YevPS8k5o25XREgdRSmHjvGLcw7USoPRdjwGurNDM/VdIUCgYEApTbA\nS4gPZCxfaruteein/bEcqxxi6FOY/Wc76bOhqb4vGubHcVr1sJuFnhdkwNa0KN9i\ni3idhom6K20R11cd5zudO86YTAAV8YDlA2OahLcQ/fqhwQOuoBGxnifEil0IcoSq\neOv1qdxbHNHUvUB21rqmjsx9ExW1kj+79uh2knUCgYEAo51nVqykAO77T0u2fYiv\nXvgzwdKCMdP0vok2SY6usNk4G0xAUJfuyxwRzOZXlbCrIg0nUb1PCHOtEtz27qDv\ndUXn8QGkrVIOyUpth0FY52J0KnlB4Q2fKH9jJkpvs3YsEZvlMU/nTCuthi/p9znU\nWDF1SEsgYrZNLIUA2vR3TAECgYBew5vi9yUU6VrFpubnUSrimi9+embFKgZL+2Xj\nM9TbvynXvV3SyEC6z0oCFxsEfWKTOyaUJ1f7ro4pkIM2SFLvqkMS5fp3RWlQwAUc\nP4qG61aEx7j2ND16tQtzUw4p6xkITs5VU8ryZmGgkz76WrqPijo1GFf5lW8zdvlC\ns64nbQKBgQCW6L7Oj3gU31bcEC2uo7DuoBsMXvGozqCa5qYOcY3l45xnXkSSAU+W\nMnx0kktlYfl5uBqXuncqX2YZM8qm4o5mxB+HjqivQm8Y0T5YgORGMhwvqQM/K7RD\nts5ZxZWURkTptma/CoTPg8+9FkJpuw0jR209Uyn/nTubu8NvXXWI1g==\n-----END RSA PRIVATE KEY-----"

# Note: DocuSign credentials are now hardcoded above
# To use different credentials, override these ENV variables at runtime:
# docker run -e DOCUSIGN_PRIVATE_KEY="your-key" ...
# or use docker-compose with .env file

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