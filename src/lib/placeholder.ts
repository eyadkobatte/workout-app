import type { Workout, WorkoutSet } from "./db";
import { bestSet, e1rm, isLoggedSet, setVolume } from "./stats";

/**
 * The Placeholder rule, in one place: everything an exercise's UI and Finish
 * need from its history. Input contract: `history` is finished workouts only,
 * oldest first — callers pre-filter; no helper here checks `endedAt`.
 */
export interface ExerciseContext {
  /** The previous session's sets, matched by position (same-numbered set). */
  previousSets: WorkoutSet[] | null;
  /** Best set of the previous session — the LAST chip. */
  lastBest: WorkoutSet | null;
  /** All-time best set by e1RM — the BEST chip. */
  bestEver: WorkoutSet | null;
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

/** The exercise's most recent session (history is finished workouts, oldest first). */
function lastSession(history: Workout[], name: string): Workout | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].exercises.some((e) => e.name === name)) return history[i];
  }
  return null;
}

/** Logged sets for an exercise across the history, oldest first. */
function exerciseSets(history: Workout[], name: string): WorkoutSet[] {
  return history.flatMap((w) => sessionSets(w, name));
}

/** The resolved context for one exercise: prev column, LAST chip, BEST chip. */
export function resolveExerciseContext(history: Workout[], name: string): ExerciseContext {
  const prev = lastSession(history, name);
  return {
    previousSets: prev?.exercises.find((e) => e.name === name)?.sets ?? null,
    lastBest: prev ? bestSet(sessionSets(prev, name)) : null,
    bestEver: bestSet(exerciseSets(history, name)),
  };
}
