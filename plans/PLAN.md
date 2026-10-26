# Workout App — Master Plan

A very simple workout tracker: "an Excel sheet with better UX". Client-only PWA,
no server-side code, no accounts, all data on-device. Self-hosted in Docker
behind Cloudflare Tunnel.

## Requirements (from user)

1. Home page: previous workouts as cards with a quick glimpse of each.
2. One button to start a new workout.
3. One button to add a new exercise.
4. A library of exercises.
5. While logging: show previous weight/reps in light color AND all-time best
   set at the same time.
6. "Finish workout" records end time → session duration visible.
7. Stats per workout: total volume lifted, total sets done (and reps).
8. Progress charts per exercise over time: volume, total reps, total sets,
   estimated 1RM.
9. Export data to CSV (opens in Excel/Sheets).
10. Free exercise GIFs/images — no paid API, nothing stored server-side.

## Stack (locked)

- **Vite + React + TypeScript (strict)** — plain static build, zero server code.
- **Tailwind CSS v4** — CSS-first config, CSS-variable theming.
- **shadcn/ui** — only the pieces we need (`button`, `input`, `card`,
  `dialog`/`sheet`), copied into `src/components/ui/`. Custom components
  (SetRow, charts, WorkoutCard) stay hand-built.
- **Motion** (`motion/react`, formerly Framer Motion) — animations.
- **vite-plugin-pwa** — service worker generation + precache (build-time only).
- **Vitest** — unit tests for stats math.
- No router library (tiny hash-router hook), no state library.

## Tooling (locked)

- **oxlint** — linting (TS + React rules).
- **oxfmt** — formatting.
- **tsc --noEmit** — type checking (oxlint is not type-aware).
- `npm run check` = typecheck + lint + format:check + tests. This is the gate.
- Note: oxfmt does not sort Tailwind class names (cosmetic only).

## Theming

- Light + dark themes via Tailwind class strategy.
- Follows system preference by default; sun/moon toggle in header persists
  choice to localStorage.
- Minimal design: near-white / near-black surfaces, ONE accent color, system
  font, rounded cards, big touch targets.

## Animations (via Motion)

- Home cards stagger-fade in.
- Set rows animate in/out (layout animation).
- Exercise picker = bottom sheet sliding up with dimmed backdrop.
- Charts draw in (SVG stroke animation).
- Page/tab cross-fades, subtle button press springs, finish-workout success check.

## Data model (IndexedDB)

```ts
interface WorkoutSet {
  kg: number | null;
  reps: number | null;
}
interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
}
interface Workout {
  id?: number;
  startedAt: number;
  endedAt: number | null; // null = workout in progress
  exercises: WorkoutExercise[];
}
interface CustomExercise {
  id?: number;
  name: string;
  muscle: string;
}
```

- Two object stores: `workouts`, `customExercises`.
- In-progress workout autosaves on every change; app offers "Resume" on launch.
- A set counts as logged when `reps > 0` (kg may be 0 for bodyweight).
- Stats computed by scanning workouts — fast at personal scale.

## Key UX decisions

### Req #5 — last vs. best while logging

Each exercise card in an active workout shows two header chips:
`LAST 25kg × 8` (best set of most recent session) and `BEST 27.5kg × 6`
(all-time best by estimated 1RM). Each set row also has a grey "previous"
column showing last session's same-numbered set, and empty inputs show those
values as placeholder text. "Add set" pre-fills from the previous row.

### Req #10 — exercise images

Bundled 90KB local library: 876 exercises (name, muscle, equipment) from the
public-domain free-exercise-db dataset (`public/exercises.json`, already
generated). Each exercise has 2 frame images hosted free on GitHub
(`raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<id>/{0,1}.jpg`)
— animated by alternating frames (~0.8s), looks like a GIF. Service worker
caches viewed images for offline. Custom exercises have no image.

### Charts (no chart library)

Hand-rolled animated SVG line charts: volume, total reps, total sets, best
estimated 1RM (Epley: `kg × (1 + reps/30)`) per session.

### CSV export

One button → `workouts-YYYYMMDD.csv`, one row per set:
date, exercise, set #, kg, reps, volume, e1RM, session duration.

## Screens

- **Home** (`#/`) — resume banner (if draft), Start Workout, New Exercise,
  Export CSV, workout cards (date, duration, exercises, sets, volume).
- **Workout** (`#/workout/:id`) — active: elapsed timer, exercise cards with
  set tables, add set/exercise, finish. Finished: read-only summary + delete.
- **Exercises** (`#/exercises`) — search + muscle filter chips, add custom.
- **Exercise detail** (`#/exercise/:name`) — animated image, summary stats,
  4 progress charts, session history.

## Project layout

```
src/
  main.tsx, App.tsx, index.css
  lib/        db.ts, stats.ts, router.ts, theme.ts, exercises.ts
  screens/    Home.tsx, Workout.tsx, Exercises.tsx, ExerciseDetail.tsx
  components/ WorkoutCard.tsx, SetRow.tsx, ExercisePicker.tsx, LineChart.tsx, ...
  components/ui/  (shadcn: button, input, card, sheet/dialog)
public/
  exercises.json, icons, manifest
tests/        stats.test.ts
Dockerfile, nginx.conf, docker-compose.yml
```

## PWA

- vite-plugin-pwa: precache app shell, runtime cache-first for
  `raw.githubusercontent.com` exercise images.
- Installable on Android/iOS via Cloudflare Tunnel HTTPS.

## Docker

- Multi-stage `Dockerfile`: node stage (`npm ci && npm run check && vite build`)
  → `nginx:alpine` serving `dist/` with SPA fallback + cache headers.
- Optional `docker-compose.yml` for convenience.
- Served via Cloudflare Tunnel (HTTPS handled by cloudflared, outside the
  container).

## Deliberately out of scope

Accounts/sync, rest timer, bodyweight tracking, kg/lb toggle (numbers stored
as entered), workout templates/routines, social features.
