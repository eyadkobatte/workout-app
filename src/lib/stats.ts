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
