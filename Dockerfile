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
ENV PATH=/home/taskmaster/.npm-global/bin:$PATH
RUN mkdir -p /home/taskmaster/.npm-global && \
    chown -R taskmaster:taskmaster /home/taskmaster/.npm-global

# Switch to non-root user for npm operations
USER taskmaster

# Install global packages
RUN npm install -g @modelcontextprotocol/inspector

# Copy project files
COPY --chown=taskmaster:taskmaster package*.json ./
COPY --chown=taskmaster:taskmaster tsconfig.json ./
COPY --chown=taskmaster:taskmaster src ./src
COPY --chown=taskmaster:taskmaster data ./data

# Install dependencies and build
RUN npm ci && \
    npm run build && \
    npm prune --production

# Setup entrypoint
COPY --chown=taskmaster:taskmaster docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6274
EXPOSE 6277

CMD ["/docker-entrypoint.sh"]