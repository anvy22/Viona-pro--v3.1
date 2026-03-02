FROM oven/bun:1 AS base

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose the internal port
EXPOSE 3001

CMD ["bun", "run", "src/server.ts"]
