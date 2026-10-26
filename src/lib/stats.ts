import type { Workout, WorkoutSet } from "./db";

/** A set counts as logged when reps > 0 (kg may be 0 for bodyweight). */
export function isLoggedSet(set: WorkoutSet): boolean {
  return (set.reps ?? 0) > 0;
}

/** Estimated 1RM, Epley formula: kg * (1 + reps / 30). */
export function e1rm(kg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

export function setVolume(set: WorkoutSet): number {
  if (!isLoggedSet(set)) return 0;
  return (set.kg ?? 0) * (set.reps ?? 0);
}

export function workoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (total, ex) => total + ex.sets.reduce((sum, s) => sum + setVolume(s), 0),
    0,
  );
}

export function workoutSetCount(workout: Workout): number {
  return workout.exercises.reduce((total, ex) => total + ex.sets.filter(isLoggedSet).length, 0);
}

export function workoutRepCount(workout: Workout): number {
  return workout.exercises.reduce(
    (total, ex) =>
      total + ex.sets.reduce((sum, s) => (isLoggedSet(s) ? sum + (s.reps ?? 0) : sum), 0),
    0,
  );
}

/** Duration in ms, or null if the workout is still in progress. */
export function durationMs(workout: Workout): number | null {
  if (workout.endedAt === null) return null;
  return workout.endedAt - workout.startedAt;
}

/** Typed value, else the previous session's value, else 0 (issue 04 rule 6). */
export function effectiveValue(typed: number | null, previous: number | null): number {
  return typed ?? previous ?? 0;
}

/**
 * Finish materializes placeholders (issue 04 rule 6): every field becomes its
 * effective value, rows whose effective reps <= 0 are dropped, exercises left
 * with no logged sets are dropped, and endedAt is stamped. The previous
 * session is resolved per exercise — each exercise's own most recent session —
 * and matched per set by position.
 */
export function finishWorkout(
  workout: Workout,
  previousFor: (name: string) => Workout | null,
  endedAt: number = Date.now(),
): Workout {
  const exercises = workout.exercises
    .map((exercise) => {
      const prevEx = previousFor(exercise.name)?.exercises.find((e) => e.name === exercise.name);
      const sets = exercise.sets
        .map((set, i) => ({
          kg: effectiveValue(set.kg, prevEx?.sets[i]?.kg ?? null),
          reps: effectiveValue(set.reps, prevEx?.sets[i]?.reps ?? null),
        }))
        .filter(isLoggedSet);
      return { name: exercise.name, sets };
    })
    .filter((exercise) => exercise.sets.length > 0);
  return { ...workout, endedAt, exercises };
}

/** Reps are integers only (issue 04 rule 3) — decimal entry truncates. */
export function integerReps(value: number): number {
  return Math.trunc(value);
}

/** Volume rounds to whole kg at display time only (issue 04 rule 3). */
export function displayVolume(volume: number): number {
  return Math.round(volume);
}

/** e1RM rounds to 1 decimal at display time only (issue 04 rule 3). */
export function displayE1rm(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Elapsed clock: m:ss under an hour, h:mm:ss past (issue 04 rule 5). */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/**
 * Best set by e1RM, for the LAST/BEST chips. Bodyweight sets (e1RM 0) never
 * win; ties keep the earlier set.
 */
export function bestSet(sets: WorkoutSet[]): WorkoutSet | null {
  let best: WorkoutSet | null = null;
  let bestScore = 0;
  for (const set of sets) {
    if (!isLoggedSet(set)) continue;
    const score = e1rm(set.kg ?? 0, set.reps ?? 0);
    if (score > bestScore) {
      best = set;
      bestScore = score;
    }
  }
  return best;
}

/** Logged sets for one exercise in one workout. */
export function sessionSets(workout: Workout, name: string): WorkoutSet[] {
  return workout.exercises.find((e) => e.name === name)?.sets.filter(isLoggedSet) ?? [];
}

export interface SessionMetrics {
  volume: number;
  reps: number;
  setCount: number;
  bestE1rm: number;
}

/** Per-session chart metrics for one exercise (issue 03's four series). */
export function sessionMetrics(workout: Workout, name: string): SessionMetrics {
  const sets = sessionSets(workout, name);
  const best = bestSet(sets);
  return {
    volume: sets.reduce((sum, s) => sum + setVolume(s), 0),
    reps: sets.reduce((sum, s) => sum + (s.reps ?? 0), 0),
    setCount: sets.length,
    bestE1rm: best ? e1rm(best.kg ?? 0, best.reps ?? 0) : 0,
  };
}

/** Logged sets for an exercise across finished workouts, oldest first. */
export function exerciseSets(workouts: Workout[], name: string): WorkoutSet[] {
  return workouts.flatMap((w) => (w.endedAt === null ? [] : sessionSets(w, name)));
}

/** The exercise's most recent finished session (workouts ordered oldest first). */
export function lastSession(workouts: Workout[], name: string): Workout | null {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (w.endedAt !== null && w.exercises.some((e) => e.name === name)) return w;
  }
  return null;
}
