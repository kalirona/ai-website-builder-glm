# =============================================================================
# Dockerfile for AI Website Builder SaaS (Next.js 16 standalone + Prisma SQLite)
# Optimized for Dokploy / Docker deployment.
# =============================================================================

# ---- Builder stage ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy lockfile + package.json first for cache
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy prisma schema + generate client (needed at build for type imports)
COPY prisma ./prisma
RUN bun run db:generate

# Copy the rest of the source
COPY . .

# Build the Next.js standalone output
# (next.config.ts has output: "standalone")
RUN bun run build

# ---- Runner stage (minimal image) ----
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone server output (produced by `next build` with output: "standalone")
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma client + schema (needed at runtime for the SQLite driver)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Create the db directory (SQLite file lives here) + give the runner ownership
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Run migrations on container start, then start the server.
# `db:push` creates/updates the SQLite schema; `server.js` is the standalone build.
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && node server.js"]
