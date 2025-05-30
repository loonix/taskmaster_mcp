FROM node:20.11.0-slim

# Install netcat for healthcheck
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies and build
RUN npm ci && \
    npm run build && \
    npm prune --production && \
    npm install -g @modelcontextprotocol/inspector

# Create data directory and non-root user
RUN mkdir -p /app/data && \
    useradd -m taskmaster && \
    chown -R taskmaster:taskmaster /app

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    chown taskmaster:taskmaster /docker-entrypoint.sh

USER taskmaster

EXPOSE 6274
EXPOSE 6277

CMD ["/docker-entrypoint.sh"]