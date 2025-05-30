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

# Set environment variables
ENV DOCKER_ENV=true
ENV PATH="/app/node_modules/.bin:${PATH}"

# Switch to non-root user for npm operations
USER taskmaster

# Copy package files first for better caching
COPY --chown=taskmaster:taskmaster package*.json ./
COPY --chown=taskmaster:taskmaster tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source files
COPY --chown=taskmaster:taskmaster src ./src

# Build the application
RUN npm run build

# Setup entrypoint
COPY --chown=taskmaster:taskmaster docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 6274
EXPOSE 6277

# Create a volume for persistent data
VOLUME /app/data

CMD ["/docker-entrypoint.sh"]