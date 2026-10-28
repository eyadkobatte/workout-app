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
