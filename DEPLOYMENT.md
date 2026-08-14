# Deployment Guide — AI Website Builder SaaS

This app is a **Next.js 16 standalone** build with **Prisma + SQLite** (file-based DB). It runs on **port 3084** and works behind any reverse proxy (Dokploy's Traefik, Caddy, Nginx).

---

## Required Environment Variables

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `file:/app/db/custom.db` | SQLite DB path. Must be inside a persisted volume. |
| `NEXTAUTH_SECRET` | ✅ | (32+ random chars) | JWT signing secret. Generate with `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | ✅ behind proxy | `true` | Makes NextAuth trust `X-Forwarded-Host`/`X-Forwarded-Proto` from the reverse proxy so cookies + redirects use the public URL (not localhost). **Set to `true` on Dokploy.** |
| `NEXTAUTH_URL` | ⚠️ optional | `https://your-domain.com` | Force the public URL. Set this ONLY if `AUTH_TRUST_HOST=true` isn't enough (rare). |
| `NODE_ENV` | auto | `production` | Set automatically by the Dockerfile. |
| `PORT` | auto | `3084` | Set automatically by the Dockerfile. |

### Generate a NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

---

## Dokploy Deployment

### Option A — Deploy via Dockerfile (recommended for Dokploy)

1. **In Dokploy, create a new Application → "Dockerfile" source.**
2. Point it at your Git repo: `https://github.com/kalirona/ai-website-builder-glm`
3. **Build context:** `/` (root)
4. **Dockerfile path:** `Dockerfile`
5. **Port:** `3084`
6. **Add the environment variables** (see table above) in Dokploy's "Environment Variables" section.

### Option B — Deploy via Compose

1. **In Dokploy, create a new Application → "Docker Compose" source.**
2. Paste the contents of `docker-compose.yml`, OR point to the repo (it contains the file).
3. **Set the env vars** in a `.env` file or Dokploy's env editor:
   ```
   NEXTAUTH_SECRET=<your-secret>
   ```
4. The compose file already sets `DATABASE_URL`, `AUTH_TRUST_HOST`, and the port.

### The "Service Name" for Dokploy domain mapping

When Dokploy asks for a **service name** to point a domain at, use:

```
web
```

**Why:** In `docker-compose.yml`, the service is defined as `services: web:`. Dokploy's Traefik routes to the service by its compose service name. If you deployed via Dockerfile (single container), the service name is the **container name**: `ai-website-builder` (set in compose) or the auto-generated name Dokploy assigns.

**For a single-container (Dockerfile) deployment in Dokploy:**
- The "Service Name" field should match the container's internal service. Since there's only one service, use `web` or leave it as Dokploy's default — Dokploy will route to port `3084` (the exposed port in the Dockerfile).

### Domain mapping in Dokploy
1. Go to your application → **Domains**.
2. Add your domain (e.g., `builder.yourdomain.com`).
3. Dokploy's Traefik will proxy `https://builder.yourdomain.com` → your container's port `3084`.
4. Traefik automatically sets `X-Forwarded-Host` and `X-Forwarded-Proto`, which `AUTH_TRUST_HOST=true` makes NextAuth trust.

---

## Files Created

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: builder (bun) → runner (bun, minimal, non-root). Runs `prisma db push` on start, then `server.js`. |
| `.dockerignore` | Excludes `.env`, `node_modules`, `.next`, `db/*.db`, logs, git, docs, sandbox files. |
| `docker-compose.yml` | Single `web` service, port 3084, persisted `db-data` volume, healthcheck. |
| `.env.example` | Documents required env vars (no secrets). |

---

## Local Docker Test

```bash
# Build + run
docker compose up -d --build

# View logs
docker compose logs -f web

# Access
open http://localhost:3084
```

The first user you register becomes the admin (no preset admin account).

---

## Persistence

- **SQLite DB:** stored in a Docker volume (`db-data` → `/app/db/custom.db`). Survives container restarts and rebuilds.
- **Uploaded files/media:** not yet implemented (future: Directus media library).
- **Editor state:** stored in the SQLite DB (Page.editorData JSON column).

---

## Behind a Custom Reverse Proxy (not Dokploy)

If you use Caddy/Nginx directly, ensure these headers are forwarded (Caddyfile already does this):
```
header_up Host {host}
header_up X-Forwarded-For {remote_host}
header_up X-Forwarded-Proto {scheme}
header_up X-Real-IP {remote_host}
```
With `AUTH_TRUST_HOST=true`, NextAuth will use these to compute the correct public URL.

---

## Troubleshooting

### "redirected you too many times" after login
- **Cause:** `AUTH_TRUST_HOST` not set, or the proxy isn't forwarding `X-Forwarded-Proto`.
- **Fix:** Set `AUTH_TRUST_HOST=true` and ensure your proxy forwards `X-Forwarded-Proto: https`.
- **Fallback:** Set `NEXTAUTH_URL=https://your-exact-domain.com` to force the URL.

### 401 on all API calls after login
- **Cause:** `NEXTAUTH_SECRET` missing or changed. JWTs can't be verified.
- **Fix:** Set a stable `NEXTAUTH_SECRET` env var. Don't change it between deploys (existing sessions break).

### Database not persisting
- **Cause:** SQLite file not in a volume.
- **Fix:** Use the `db-data` volume in `docker-compose.yml`, or mount a volume at `/app/db`.

### Port already in use
- The Dockerfile exposes `3084`. Change `ports: - "3084:3084"` in compose to `"8080:3084"` if you need a different host port.