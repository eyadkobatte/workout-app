export interface ExerciseInfo {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
}

let cache: ExerciseInfo[] | null = null;

/** Load the bundled exercise library (public/exercises.json, 876 exercises). */
export async function loadExercises(): Promise<ExerciseInfo[]> {
  if (cache) return cache;
  const res = await fetch("/exercises.json");
  cache = (await res.json()) as ExerciseInfo[];
  return cache;
}

/**
 * Two frame images hosted on GitHub (free-exercise-db). Alternate them ~0.8s
 * for a GIF-like animation. Service worker caches viewed images for offline.
 */
export function exerciseImageUrls(id: string): [string, string] {
  const base = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`];
}
