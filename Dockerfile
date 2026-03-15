# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for both client and server
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Accept build-time env vars from Railway (VITE_* must be baked in at build time)
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GOOGLE_API_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Make them available as environment variables during the Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

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
