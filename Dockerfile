FROM node:20.11.0-slim

# Install netcat for healthcheck
RUN apt-get update && \
    apt-get install -y netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci && \
    npm run build && \
    npm prune --production && \
    npm install -g @modelcontextprotocol/inspector

# Create data directory and non-root user
RUN mkdir -p /app/data && \
    useradd -m taskmaster && \
    chown -R taskmaster:taskmaster /app

USER taskmaster

EXPOSE 6274
EXPOSE 6277

ENV HOST=0.0.0.0
ENV MCP_INSPECTOR_HOST=0.0.0.0

CMD ["sh", "-c", "mcp-inspector --host 0.0.0.0 build/index.js"]