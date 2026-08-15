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

# ---- Runner stage (production image) ----
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3084
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/db/custom.db

# Create a non-root user for security (Debian-based image uses groupadd/useradd)
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Copy the standalone server output (produced by `next build` with output: "standalone").
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy the FULL node_modules from the builder.
# The standalone output only contains traced runtime deps — it does NOT include
# the prisma CLI, its transitive deps (c12, effect, deepmerge-ts, empathic, …),
# or .bin shims. Copying the full node_modules guarantees `prisma db push`
# (Prisma 6) works at container start without `bunx` (which would download the
# latest Prisma v7+ and fail P1012 on this project's schema, which still uses
# `url` in the datasource block).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Create the db directory (SQLite file lives here) + give the runner ownership
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3084

# Run migrations on container start, then start the server.
# We invoke the local Prisma 6 CLI directly (node_modules/prisma was copied in).
# Do NOT use `bunx prisma` here — bunx falls back to downloading the latest
# Prisma (v7+), which requires prisma.config.ts and no `url` in the schema's
# datasource block, causing P1012 validation errors with this project's schema.
# `bun server.js` runs the Next.js standalone server (bun is Node-compatible).
CMD ["sh", "-c", "bun node_modules/prisma/build/index.js db push --accept-data-loss && bun server.js"]