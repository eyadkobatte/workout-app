import { deleteWorkout, getWorkouts, putWorkout, type Workout } from "./db";
import { resolveExerciseContext } from "./placeholder";
import { isLoggedSet } from "./stats";

/** A workout in progress — `endedAt` not yet stamped. */
export function isDraft(workout: Workout): boolean {
  return workout.endedAt === null;
}

/** A workout whose `endedAt` is stamped — the finished kind, provably. */
export type FinishedWorkout = Workout & { endedAt: number };

/**
 * The finished workouts, oldest first. `getWorkouts()` returns ascending
 * `id` = creation order (ADR 0001), so this filter preserves chronological
 * order; callers reverse for newest-first.
 */
export function finishedWorkouts(all: readonly Workout[]): FinishedWorkout[] {
  return all.filter((w): w is FinishedWorkout => !isDraft(w));
}

/** The active draft, or null — at most one exists (ADR 0001). */
export function activeDraft(all: readonly Workout[]): Workout | null {
  return all.filter(isDraft).at(-1) ?? null;
}

/** No logged set anywhere in the draft — sharper than "no exercises". */
export function nothingLogged(draft: Workout): boolean {
  return !draft.exercises.some((ex) => ex.sets.some(isLoggedSet));
}

// One in-flight creation, shared so StrictMode's double mount writes once.
// Cleared when it settles, so a later call (after finish/delete) creates fresh.
let creatingDraft: Promise<Workout> | null = null;

/**
 * Start-or-resume: the existing draft if one exists (ADR 0001 — at most
 * one), else a new one, persisted.
 */
export function createDraft(): Promise<Workout> {
  if (creatingDraft) return creatingDraft;
  const pending = (async () => {
    try {
      const existing = activeDraft(await getWorkouts());
      if (existing) return existing;
      const draft: Workout = { startedAt: Date.now(), endedAt: null, exercises: [] };
      const id = await putWorkout(draft);
      return { ...draft, id };
    } finally {
      creatingDraft = null;
    }
  })();
  creatingDraft = pending;
  return pending;
}

/** Autosave — a draft never dies to a killed app. */
export function saveDraft(draft: Workout): Promise<void> {
  return putWorkout(draft).then(() => undefined);
}

/**
 * Leaving with nothing logged: the draft dies — nothing typed means
 * nothing to resume. Finished workouts are never touched.
 */
export async function discardIfEmpty(draft: Workout): Promise<void> {
  if (draft.id === undefined || !isDraft(draft) || !nothingLogged(draft)) return;
  await deleteWorkout(draft.id);
}

/** Typed value, else the previous session's same-numbered set value, else 0. */
function effectiveValue(typed: number | null, previous: number | null): number {
  return typed ?? previous ?? 0;
}

/**
 * Materialize placeholders (issue 04 rule 6): every field becomes its
 * effective value via the resolver's positional match, rows whose effective
 * reps <= 0 are dropped, exercises left with no logged sets are dropped, and
 * endedAt is stamped. History: finished workouts only, oldest first.
 */
function finishWorkout(
  workout: Workout,
  history: Workout[],
  endedAt: number = Date.now(),
): Workout {
  const exercises = workout.exercises
    .map((exercise) => {
      const { previousSets } = resolveExerciseContext(history, exercise.name);
      const sets = exercise.sets
        .map((set, i) => ({
          kg: effectiveValue(set.kg, previousSets?.[i]?.kg ?? null),
          reps: effectiveValue(set.reps, previousSets?.[i]?.reps ?? null),
        }))
        .filter(isLoggedSet);
      return { name: exercise.name, sets };
    })
    .filter((exercise) => exercise.sets.length > 0);
  return { ...workout, endedAt, exercises };
}

/**
 * The draft → finished transition: materialize placeholders via the
 * resolver, stamp the end, persist — or discard instead when nothing is
 * logged (nothing materializes to a logged set, so the draft dies rather
 * than persisting an empty record). Returns the persisted workout, or
 * null when the draft was discarded.
 */
export async function finish(draft: Workout, history: Workout[]): Promise<Workout | null> {
  const finished = finishWorkout(draft, history);
  if (finished.exercises.length === 0) {
    if (draft.id !== undefined) await deleteWorkout(draft.id);
    return null;
  }
  await putWorkout(finished);
  return finished;
}
