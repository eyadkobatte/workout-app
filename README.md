# Workout App

A very simple workout tracker, an Excel sheet with better UX. Client-only PWA, no
server-side code, no accounts, all data on-device (IndexedDB). Self-hosted in Docker
behind Cloudflare Tunnel. The domain model is in `GLOSSARY.md`, and decisions are in
`docs/adr/`.

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

CI runs the same gate inside a Docker build for every pull request and push to `main`.

## Docker

Build and run locally:

```sh
docker build -t workout-app .
docker run -p 8080:80 workout-app
```

Deploy from GHCR:

```sh
docker compose pull
docker compose up -d
```

`docker-compose.yml` pins `ghcr.io/eyadkobatte/workout-app:0.1.0`. If the package is
private, run `docker login ghcr.io` before pulling.

## Releases

Versions follow [Semantic Versioning](https://semver.org/). Use a major version for
breaking changes, a minor version for features, and a patch version for fixes.

To publish a release:

1. Run `npm version 1.2.3 --no-git-tag-version`.
2. Commit and push the package version change to `main`.
3. Tag that commit with `git tag -a v1.2.3 -m "Release 1.2.3"` and push the tag.

The release workflow publishes `1.2.3`, `1.2`, `1`, and `latest` to
`ghcr.io/eyadkobatte/workout-app`. Do not move or delete a release tag. Cut a new
patch release instead.

HTTPS is handled by cloudflared (Cloudflare Tunnel), outside the container.
