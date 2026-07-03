# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Stage 1 — BUILD: compile frontend (Vite) + backend (tsc)
# ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install all workspace deps (incl. dev: vite, tsc) from the root lockfile.
# --ignore-scripts skips the server's Playwright postinstall — no browser
# is needed to compile TypeScript, and it keeps the build fast.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN npm ci --ignore-scripts

# Copy sources and build both workspaces.
#   frontend → frontend/dist   (static SPA)
#   server   → server/dist     (compiled JS)
COPY frontend ./frontend
COPY server ./server
RUN npm run build -w frontend \
 && npm run build -w server

# ─────────────────────────────────────────────────────────────
# Stage 2 — RUNTIME: Node + Chromium, serves API + SPA
# ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Production deps only (no vite/tsc/tsx/drizzle-kit), then Chromium + the
# system libraries it needs. --ignore-scripts so we control the browser
# install explicitly instead of relying on the postinstall hook.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN npm ci --omit=dev --ignore-scripts \
 && npx playwright install --with-deps chromium \
 && npm cache clean --force \
 && rm -rf /var/lib/apt/lists/*

# Compiled backend + built SPA (served from ../public). The database schema
# is managed externally (Supabase), so no migration files ship in the image.
COPY --from=build /app/server/dist   ./server/dist
COPY --from=build /app/frontend/dist ./server/public

WORKDIR /app/server
EXPOSE 8000

# Coolify reads this to mark the container healthy. Node 22 has global fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Just start the HTTP + WebSocket server. No migrations — the schema lives in
# Supabase and is created once via the Supabase SQL Editor.
CMD ["node", "dist/index.js"]
