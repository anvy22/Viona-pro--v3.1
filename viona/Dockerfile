# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of the app
COPY . .

# ✅ Accept build arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_NOTIFICATION_SERVER_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL

# ✅ Set them as environment variables for the build
ENV NEXT_PUBLIC_NOTIFICATION_SERVER_URL=$NEXT_PUBLIC_NOTIFICATION_SERVER_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

# Build Next.js (standalone output)
RUN npm run build

# 2. Run stage (production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy standalone output (includes server + node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static assets (not included in standalone)
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder (images, fonts, etc.)
COPY --from=builder /app/public ./public

# Copy Prisma schema (needed for runtime migrations)
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

# Start standalone Next.js server (includes BullMQ worker + cron via instrumentation.ts)
CMD ["node", "server.js"]