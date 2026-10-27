/**
 * Canonical muscle-group taxonomy. Categories are derived, never stored: each
 * exercise's source `muscle` string (free-exercise-db values, or the free-text
 * value on legacy custom exercises) maps to exactly one group at load time via
 * `normalizeMuscle`. The UI only ever sees `MUSCLE_GROUPS`, plus a reserved
 * "uncategorized" bucket that appears solely for legacy custom exercises whose
 * muscle matches nothing — those are never silently reassigned.
 */

export const MUSCLE_GROUPS = [
  "shoulders",
  "biceps",
  "triceps",
  "back",
  "legs",
  "core",
  "chest",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Reserved bucket for legacy custom exercises whose muscle matches nothing. */
export const UNGROUPED = "uncategorized";
export type Category = MuscleGroup | typeof UNGROUPED;

/** Display label ("shoulders" → "Shoulders", "uncategorized" → "Uncategorized"). */
export function groupLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * free-exercise-db muscles, plus common custom-exercise spellings, → group.
 * Canonical group ids map to themselves so a saved custom exercise round-trips
 * (the picker stores the group id as `muscle`; see Exercises.tsx save path).
 */
const SOURCE_TO_GROUP: Record<string, MuscleGroup> = {
  shoulders: "shoulders",
  traps: "shoulders",
  neck: "shoulders",

  chest: "chest",

  biceps: "biceps",
  forearms: "biceps",
  forearm: "biceps",

  triceps: "triceps",

  lats: "back",
  "middle back": "back",
  "lower back": "back",
  "upper back": "back",
  back: "back",

  quadriceps: "legs",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
  calf: "legs",
  glutes: "legs",
  abductors: "legs",
  adductors: "legs",
  legs: "legs",

  abdominals: "core",
  abs: "core",
  core: "core",
};

/** Maps a raw muscle string to a canonical group; null when unrecognized. */
export function normalizeMuscle(value: string): MuscleGroup | null {
  return SOURCE_TO_GROUP[value.trim().toLowerCase()] ?? null;
}
