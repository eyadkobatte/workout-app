import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  deleteWorkout,
  getWorkout,
  getWorkouts,
  putWorkout,
  type Workout,
} from "../src/lib/db";
import {
  activeDraft,
  createDraft,
  discardIfEmpty,
  finish,
  finishedWorkouts,
  isDraft,
  nothingLogged,
} from "../src/lib/workoutSession";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async () => {
  await closeDb();
});

describe("pure predicates", () => {
  // A draft with an exercise added but nothing typed — sharper than
  // today's `exercises.length === 0` emptiness.
  const draft: Workout = {
    id: 1,
    startedAt: 0,
    endedAt: null,
    exercises: [{ name: "Bench", sets: [{ kg: null, reps: null }] }],
  };
  const logged: Workout = {
    id: 1,
    startedAt: 0,
    endedAt: null,
    exercises: [{ name: "Bench", sets: [{ kg: 60, reps: 8 }] }],
  };
  const done: Workout = { id: 2, startedAt: 0, endedAt: 10, exercises: [] };

  it("tells a draft from a finished workout by endedAt", () => {
    expect(isDraft(draft)).toBe(true);
    expect(isDraft(done)).toBe(false);
  });

  it("finds the active draft among all workouts", () => {
    expect(activeDraft([done, draft])).toBe(draft);
    expect(activeDraft([done])).toBeNull();
  });

  it("splits finished workouts out, oldest first", () => {
    expect(finishedWorkouts([done, draft])).toEqual([done]);
    expect(finishedWorkouts([draft])).toEqual([]);
  });

  it("calls a draft empty when no set anywhere is logged, not merely when no exercise exists", () => {
    expect(nothingLogged(draft)).toBe(true);
    expect(nothingLogged(logged)).toBe(false);
    expect(nothingLogged({ ...draft, exercises: [] })).toBe(true);
  });
});

describe("createDraft", () => {
  it("shares one write across concurrent callers (StrictMode double mount)", async () => {
    const [a, b] = await Promise.all([createDraft(), createDraft()]);
    expect(a).toEqual(b);
    expect(await getWorkouts()).toHaveLength(1);
  });

  it("resumes the existing draft instead of creating a second", async () => {
    const first = await createDraft();
    const second = await createDraft();
    expect(second.id).toBe(first.id);
    expect(await getWorkouts()).toHaveLength(1);
    expect(activeDraft(await getWorkouts())?.id).toBe(first.id);
  });

  it("creates fresh once the draft has died", async () => {
    const first = await createDraft();
    await deleteWorkout(first.id!);
    const second = await createDraft();
    expect(second.id).not.toBe(first.id);
    expect(await getWorkouts()).toHaveLength(1);
  });
});

describe("discardIfEmpty (Back with nothing logged)", () => {
  it("deletes a draft with nothing logged, even when exercises exist", async () => {
    const draft = await createDraft();
    await discardIfEmpty({
      ...draft,
      exercises: [{ name: "Bench", sets: [{ kg: null, reps: null }] }],
    });
    expect(await getWorkouts()).toEqual([]);
  });

  it("keeps a draft with a logged set", async () => {
    const draft = await createDraft();
    await discardIfEmpty({
      ...draft,
      exercises: [{ name: "Bench", sets: [{ kg: 60, reps: 8 }] }],
    });
    expect(await getWorkouts()).toHaveLength(1);
  });

  it("never deletes a finished workout, however empty", async () => {
    const empty: Workout = { startedAt: 0, endedAt: 10, exercises: [] };
    const id = await putWorkout(empty);
    await discardIfEmpty({ ...empty, id });
    expect(await getWorkout(id)).toBeDefined();
  });
});

describe("finish (draft → finished)", () => {
  const benchSession: Workout = {
    id: 5,
    startedAt: 0,
    endedAt: 1,
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { kg: 60, reps: 8 },
          { kg: 65, reps: 5 },
        ],
      },
    ],
  };
  const pullSession: Workout = {
    id: 4,
    startedAt: 0,
    endedAt: 1,
    exercises: [
      {
        name: "Pull-Up",
        sets: [
          { kg: 0, reps: 10 },
          { kg: 0, reps: 8 },
        ],
      },
    ],
  };
  // Each exercise's own most recent session, not one shared "previous workout".
  const history: Workout[] = [pullSession, benchSession]; // oldest first

  it("materializes placeholders, drops unlogged rows and empty exercises, stamps the end, persists", async () => {
    const draft = await createDraft();
    const finished = await finish(
      {
        ...draft,
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { kg: 62.5, reps: null }, // typed kg wins; reps materializes
              { kg: null, reps: null }, // both materialize
              { kg: 40, reps: 0 }, // typed reps 0 → dropped
            ],
          },
          {
            name: "Pull-Up",
            sets: [
              { kg: 0, reps: 10 },
              { kg: null, reps: null }, // previous bodyweight kg 0 stands
            ],
          },
          { name: "Squat", sets: [{ kg: null, reps: null }] }, // no history, untouched
        ],
      },
      history,
    );
    expect(finished?.endedAt).not.toBeNull();
    expect(finished?.id).toBe(draft.id);
    expect(finished?.exercises).toEqual([
      {
        name: "Bench Press",
        sets: [
          { kg: 62.5, reps: 8 },
          { kg: 65, reps: 5 },
        ],
      },
      {
        name: "Pull-Up",
        sets: [
          { kg: 0, reps: 10 },
          { kg: 0, reps: 8 },
        ],
      },
    ]);
    expect(await getWorkout(draft.id!)).toEqual(finished);
  });

  it("drops an untouched set past the end of the previous session's sets", async () => {
    const draft = await createDraft();
    const finished = await finish(
      {
        ...draft,
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { kg: null, reps: null },
              { kg: null, reps: null },
              { kg: null, reps: null }, // no same-numbered previous set → 0
            ],
          },
        ],
      },
      history,
    );
    expect(finished?.exercises).toEqual([
      {
        name: "Bench Press",
        sets: [
          { kg: 60, reps: 8 },
          { kg: 65, reps: 5 },
        ],
      },
    ]);
  });

  it("discards a nothing-logged draft instead of persisting an empty record", async () => {
    const draft = await createDraft();
    const finished = await finish(
      { ...draft, exercises: [{ name: "Squat", sets: [{ kg: null, reps: null }] }] },
      history, // no Squat history — nothing materializes
    );
    expect(finished).toBeNull();
    expect(await getWorkout(draft.id!)).toBeUndefined();
  });

  it("persists workouts in ascending id (creation) order", async () => {
    for (let i = 0; i < 3; i++) {
      const draft = await createDraft();
      const done = await finish(
        { ...draft, exercises: [{ name: "Bench", sets: [{ kg: 60, reps: 8 }] }] },
        [],
      );
      expect(done).not.toBeNull();
    }
    expect((await getWorkouts()).map((w) => w.id)).toEqual([1, 2, 3]);
  });
});
