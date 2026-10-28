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
The workflow is defined in `.github/workflows/ci.yml`.

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

### CI workflow

`.github/workflows/ci.yml` runs on every pull request and every push to `main`.
It builds the Docker image and runs the full gate inside the build. It does not
publish the image.

### Release workflow

`.github/workflows/release.yml` runs when a tag matching `vMAJOR.MINOR.PATCH` is
pushed. It verifies that the tag matches `package.json`, builds the image for
`linux/amd64`, logs in to GHCR with `GITHUB_TOKEN`, and publishes the `MAJOR.MINOR.PATCH`,
`MAJOR.MINOR`, `MAJOR`, and `latest` tags. It also records provenance and an SBOM
for the image.

### Publishing a new version

1. Decide the next semantic version.
2. Update the package version:

   ```sh
   npm version 1.2.3 --no-git-tag-version
   ```

3. Commit and push the version change to `main`.
4. Tag that commit and push the tag:

   ```sh
   git tag -a v1.2.3 -m "Release 1.2.3"
   git push origin v1.2.3
   ```

The release workflow publishes the image to `ghcr.io/eyadkobatte/workout-app`.
Do not move or delete a release tag. Cut a new patch release instead.

HTTPS is handled by cloudflared (Cloudflare Tunnel), outside the container.
