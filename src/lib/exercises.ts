import { getCustomExercises, type CustomExercise } from "./db";

export interface ExerciseInfo {
  /** free-exercise-db id; customs get a stable `custom:<id>` pseudo-id. */
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  /** Custom exercises are on-device only and have no animation frames. */
  custom?: boolean;
}

let bundledCache: ExerciseInfo[] | null = null;

async function loadBundled(): Promise<ExerciseInfo[]> {
  if (bundledCache) return bundledCache;
  const res = await fetch("/exercises.json");
  bundledCache = (await res.json()) as ExerciseInfo[];
  return bundledCache;
}

function toInfo(custom: CustomExercise): ExerciseInfo {
  return {
    id: `custom:${custom.id ?? custom.name}`,
    name: custom.name,
    muscle: custom.muscle,
    equipment: "",
    custom: true,
  };
}

/** Bundled library merged with on-device custom exercises, name-sorted. */
export async function loadExercises(): Promise<ExerciseInfo[]> {
  const [bundled, custom] = await Promise.all([loadBundled(), getCustomExercises()]);
  return [...bundled, ...custom.map(toInfo)].sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseCategory {
  muscle: string;
  count: number;
}

let categoriesCache: ExerciseCategory[] | null = null;
let categoriesSource: ExerciseInfo[] | null = null;

/** Distinct muscle groups with exercise counts, name-sorted. */
export function categoryList(exercises: ExerciseInfo[]): ExerciseCategory[] {
  if (categoriesCache && categoriesSource === exercises) return categoriesCache;
  const counts = new Map<string, number>();
  for (const e of exercises) {
    counts.set(e.muscle, (counts.get(e.muscle) ?? 0) + 1);
  }
  categoriesSource = exercises;
  categoriesCache = [...counts.entries()]
    .map(([muscle, count]) => ({ muscle, count }))
    .sort((a, b) => a.muscle.localeCompare(b.muscle));
  return categoriesCache;
}

/**
 * Two frame images hosted on GitHub (free-exercise-db). Alternate them ~0.8s
 * for a GIF-like animation. Service worker caches viewed images for offline.
 * Only meaningful for non-custom exercises.
 */
export function exerciseImageUrls(id: string): [string, string] {
  const base = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`];
}
