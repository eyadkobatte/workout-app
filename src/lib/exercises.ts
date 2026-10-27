import { getCustomExercises, type CustomExercise } from "./db";
import {
  MUSCLE_GROUPS,
  UNGROUPED,
  groupLabel,
  normalizeMuscle,
  type Category,
} from "./muscleGroups";

export interface ExerciseInfo {
  /** free-exercise-db id; customs get a stable `custom:<id>` pseudo-id. */
  id: string;
  name: string;
  /** Raw source value — kept for details/display; never used for grouping. */
  muscle: string;
  equipment: string;
  /** Canonical taxonomy derived from `muscle` at load time. */
  category: Category;
  /** Custom exercises are on-device only and have no animation frames. */
  custom?: boolean;
}

let bundledCache: ExerciseInfo[] | null = null;

async function loadBundled(): Promise<ExerciseInfo[]> {
  if (bundledCache) return bundledCache;
  const res = await fetch("/exercises.json");
  const raw = (await res.json()) as Omit<ExerciseInfo, "category">[];
  bundledCache = raw.map((e) => ({
    ...e,
    category: normalizeMuscle(e.muscle) ?? UNGROUPED,
  }));
  return bundledCache;
}

function toInfo(custom: CustomExercise): ExerciseInfo {
  return {
    id: `custom:${custom.id ?? custom.name}`,
    name: custom.name,
    muscle: custom.muscle,
    equipment: "",
    category: normalizeMuscle(custom.muscle) ?? UNGROUPED,
    custom: true,
  };
}

/** Bundled library merged with on-device custom exercises, name-sorted. */
export async function loadExercises(): Promise<ExerciseInfo[]> {
  const [bundled, custom] = await Promise.all([loadBundled(), getCustomExercises()]);
  return [...bundled, ...custom.map(toInfo)].sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseCategory {
  category: Category;
  label: string;
  count: number;
}

let categoriesCache: ExerciseCategory[] | null = null;
let categoriesSource: ExerciseInfo[] | null = null;

/** Canonical groups with counts, in taxonomy order; empty ones omitted and a
 * legacy "Uncategorized" bucket appended only if unrecognized customs exist. */
export function categoryList(exercises: ExerciseInfo[]): ExerciseCategory[] {
  if (categoriesCache && categoriesSource === exercises) return categoriesCache;
  const counts = new Map<Category, number>();
  for (const e of exercises) {
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  }
  const list: ExerciseCategory[] = [];
  for (const group of MUSCLE_GROUPS) {
    const count = counts.get(group);
    if (count) list.push({ category: group, label: groupLabel(group), count });
  }
  const ungrouped = counts.get(UNGROUPED);
  if (ungrouped)
    list.push({ category: UNGROUPED, label: groupLabel(UNGROUPED), count: ungrouped });
  categoriesSource = exercises;
  categoriesCache = list;
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
