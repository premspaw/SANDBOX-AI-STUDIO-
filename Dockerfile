# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for both client and server
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the frontend (React + Vite)
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install ffmpeg for media processing (optional based on your app needs)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built dist folder, server.js, services, and necessary src files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/services ./services
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/services ./src/services
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/*.json ./

# Set Environment Variables
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run uses the PORT env var
EXPOSE 8080

# Start the server
# Note: Ensure server.js serves the 'dist' folder static files in production mode
CMD ["node", "server.js"]
