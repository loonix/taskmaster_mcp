FROM node:20.11.0-slim

WORKDIR /app

# Install netcat for healthcheck and MCP Inspector globally
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g @modelcontextprotocol/inspector

# Create non-root user and setup directories
RUN useradd -m taskmaster && \
    mkdir -p /app/data && \
    touch /app/data/tasks.json && \
    echo "[]" > /app/data/tasks.json && \
    chown -R taskmaster:taskmaster /app

# Copy and setup files with correct ownership
COPY --chown=taskmaster:taskmaster package*.json ./
COPY --chown=taskmaster:taskmaster tsconfig.json ./
COPY --chown=taskmaster:taskmaster src ./src
COPY --chown=taskmaster:taskmaster docker-entrypoint.sh /docker-entrypoint.sh

# Set permissions
RUN chmod +x /docker-entrypoint.sh && \
    chmod 755 /app/data && \
    chmod 644 /app/data/tasks.json && \
    chown -R taskmaster:taskmaster /usr/local/lib/node_modules

# Switch to non-root user
USER taskmaster

# Install dependencies and build
RUN npm ci && \
    npm run build

# Clean up build files but keep both JavaScript files
RUN mv build/index.js build/index.js.bak && \
    mv build/httpServer.js build/httpServer.js.bak && \
    rm -rf node_modules/@types && \
    npm prune --production && \
    mv build/index.js.bak build/index.js && \
    mv build/httpServer.js.bak build/httpServer.js

EXPOSE 6274
EXPOSE 6277

# Create a volume for persistent data
VOLUME /app/data

CMD ["/docker-entrypoint.sh"]