# 1. Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema BEFORE generate
COPY prisma ./prisma

# Generate Prisma client (using musl binaries)
RUN npx prisma generate

# Copy rest of the app
COPY . .

# ✅ CRITICAL: Accept build arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_NOTIFICATION_SERVER_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL

# ✅ CRITICAL: Set them as environment variables for the build
ENV NEXT_PUBLIC_NOTIFICATION_SERVER_URL=$NEXT_PUBLIC_NOTIFICATION_SERVER_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

# Build Next.js (env vars will be embedded in the bundle)
RUN npm run build

# 2. Run stage (production)
FROM node:18-alpine
WORKDIR /app

# Copy all build artifacts + Prisma files
COPY --from=builder /app ./

# Prisma needs the schema at runtime for migrations (optional)
COPY --from=builder /app/prisma ./prisma

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]