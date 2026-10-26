# Workout App

A very simple workout tracker — "an Excel sheet with better UX". Client-only PWA,
no server-side code, no accounts, all data on-device (IndexedDB). Self-hosted in
Docker behind Cloudflare Tunnel. See `plans/PLAN.md`.

## Develop

```sh
npm install
npm run dev
```

## The gate

```sh
npm run check   # typecheck (tsc --noEmit) + lint (oxlint) + format:check (oxfmt) + tests (vitest)
npm run format  # auto-format
```

## Docker

```sh
docker build -t workout-app .
docker run -p 8080:80 workout-app
# or: docker compose up --build
```

HTTPS is handled by cloudflared (Cloudflare Tunnel), outside the container.
