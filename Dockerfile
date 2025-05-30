FROM node:20.11.0-slim

# Install netcat for healthcheck
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user and setup directories
RUN useradd -m taskmaster && \
    mkdir -p /app/data && \
    touch /app/data/tasks.json && \
    echo "[]" > /app/data/tasks.json && \
    chown -R taskmaster:taskmaster /app && \
    chmod 755 /app/data && \
    chmod 644 /app/data/tasks.json

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

# Install dependencies, build, and setup inspector
RUN npm ci && \
    npm run build && \
    npm install @modelcontextprotocol/inspector && \
    npm install -g @modelcontextprotocol/inspector && \
    npm prune --production

# Setup entrypoint
COPY --chown=taskmaster:taskmaster docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6274
EXPOSE 6277

# Create a volume for persistent data
VOLUME /app/data

CMD ["/docker-entrypoint.sh"]