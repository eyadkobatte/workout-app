import type { Workout } from "./db";
import type { ExerciseInfo } from "./exercises";
import { isLoggedSet } from "./stats";
import { finishedWorkouts } from "./workoutSession";

/** Personal usage of one exercise, derived from finished workouts only. */
export interface ExerciseUsage {
  sessionCount: number;
  lastUsedAt: number;
}

export type ExerciseUsageByName = ReadonlyMap<string, ExerciseUsage>;

/**
 * Previously logged exercises: at least one logged set in a finished workout,
 * matched by exact exercise name. Drafts never contribute, and a variation
 * counts separately from its base name.
 */
export function buildExerciseUsage(workouts: readonly Workout[]): ExerciseUsageByName {
  const usage = new Map<string, ExerciseUsage>();
  for (const workout of finishedWorkouts(workouts)) {
    for (const exercise of workout.exercises) {
      if (!exercise.sets.some(isLoggedSet)) continue;
      const prev = usage.get(exercise.name);
      usage.set(exercise.name, {
        sessionCount: (prev?.sessionCount ?? 0) + 1,
        lastUsedAt: Math.max(prev?.lastUsedAt ?? workout.startedAt, workout.startedAt),
      });
    }
  }
  return usage;
}

export function previouslyLogged(usage: ExerciseUsageByName, name: string): ExerciseUsage | null {
  const use = usage.get(name);
  return use && use.sessionCount > 0 ? use : null;
}

interface UsedExercise {
  exercise: ExerciseInfo;
  usage: ExerciseUsage;
}

const byMostUsedThenName = (a: UsedExercise, b: UsedExercise) =>
  b.usage.sessionCount - a.usage.sessionCount ||
  b.usage.lastUsedAt - a.usage.lastUsedAt ||
  a.exercise.name.localeCompare(b.exercise.name);

export const DONE_BEFORE_LIMIT = 5;

export interface ExerciseSplit {
  /** Up to five most-used exercises, capped. */
  doneBefore: ExerciseInfo[];
  /** Alphabetical; includes used exercises outside the cap. */
  otherExercises: ExerciseInfo[];
}

/**
 * Splits one sortable pool into the优先 Done before group and the remaining
 * alphabetical list. Exercises outside the top five are never deleted and
 * may appear in the latter group with their usage indicator intact.
 */
export function splitCategoryExercises(
  exercises: readonly ExerciseInfo[],
  usage: ExerciseUsageByName,
): ExerciseSplit {
  const others: ExerciseInfo[] = [];
  const used: UsedExercise[] = [];
  for (const exercise of exercises) {
    const use = usage.get(exercise.name) ?? null;
    const isDoneBefore = use !== null && use.sessionCount > 0;
    if (isDoneBefore) {
      used.push({ exercise, usage: use });
    } else {
      others.push(exercise);
    }
  }
  used.sort(byMostUsedThenName);
  const doneBefore = used.map((u) => u.exercise).slice(0, DONE_BEFORE_LIMIT);
  const usedSet = new Set(doneBefore.map((e) => e.name));
  const otherExercises = exercises
    .filter((e) => !usedSet.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { doneBefore, otherExercises };
}
