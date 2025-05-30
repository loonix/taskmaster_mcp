FROM node:20.11.0-slim

# Install netcat for healthcheck
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user first
RUN useradd -m taskmaster && \
    mkdir -p /app/data && \
    chown -R taskmaster:taskmaster /app

# Setup npm for non-root user
ENV NPM_CONFIG_PREFIX=/home/taskmaster/.npm-global
ENV PATH="/home/taskmaster/.npm-global/bin:/app/node_modules/.bin:${PATH}"
RUN mkdir -p /home/taskmaster/.npm-global && \
    chown -R taskmaster:taskmaster /home/taskmaster/.npm-global

# Switch to non-root user for npm operations
USER taskmaster

# Copy project files
COPY --chown=taskmaster:taskmaster package*.json ./
COPY --chown=taskmaster:taskmaster tsconfig.json ./
COPY --chown=taskmaster:taskmaster src ./src
COPY --chown=taskmaster:taskmaster data ./data

# Install dependencies, build, and setup inspector
RUN npm ci && \
    npm run build && \
    npm install @modelcontextprotocol/inspector && \
    npm install -g @modelcontextprotocol/inspector && \
    npm prune --production

# Verify inspector installation
RUN which mcp-inspector || echo "mcp-inspector not in PATH"
RUN ls -la /home/taskmaster/.npm-global/bin/mcp-inspector || echo "Not in .npm-global"
RUN ls -la node_modules/.bin/mcp-inspector || echo "Not in node_modules/.bin"

# Setup entrypoint
COPY --chown=taskmaster:taskmaster docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6274
EXPOSE 6277

CMD ["/docker-entrypoint.sh"]