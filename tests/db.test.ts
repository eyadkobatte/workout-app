import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  deleteWorkout,
  getCustomExercises,
  getWorkout,
  getWorkouts,
  putCustomExercise,
  putWorkout,
} from "../src/lib/db";
import type { CustomExercise, Workout } from "../src/lib/db";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async () => {
  await closeDb();
});

const workout: Workout = {
  startedAt: 1_000,
  endedAt: 3_601_000,
  exercises: [
    {
      name: "Bench Press",
      sets: [
        { kg: 12.45, reps: 8 },
        { kg: 0, reps: 10 },
        { kg: null, reps: null },
      ],
    },
  ],
};

describe("db round-trip", () => {
  it("stores a workout and reads it back verbatim", async () => {
    const id = await putWorkout(workout);
    expect(typeof id).toBe("number");

    const stored = await getWorkout(id);
    expect(stored).toEqual({ ...workout, id });

    const all = await getWorkouts();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe(id);
  });

  it("keeps decimal kg, bodyweight kg 0 and unlogged sets intact", async () => {
    const id = await putWorkout(workout);
    const stored = await getWorkout(id);
    const sets = stored?.exercises[0]?.sets;
    expect(sets?.[0]?.kg).toBe(12.45); // decimal stored verbatim
    expect(sets?.[1]).toEqual({ kg: 0, reps: 10 }); // 0 = deliberate bodyweight
    expect(sets?.[2]).toEqual({ kg: null, reps: null }); // null = not entered
  });

  it("updates a workout in place", async () => {
    const id = await putWorkout(workout);
    await putWorkout({
      ...workout,
      id,
      exercises: [{ name: "Bench Press", sets: [{ kg: 65, reps: 5 }] }],
    });

    const all = await getWorkouts();
    expect(all).toHaveLength(1);
    expect(all[0]?.exercises[0]?.sets).toEqual([{ kg: 65, reps: 5 }]);
  });

  it("deletes a workout", async () => {
    const id = await putWorkout(workout);
    await deleteWorkout(id);
    expect(await getWorkout(id)).toBeUndefined();
    expect(await getWorkouts()).toEqual([]);
  });

  it("stores custom exercises with autoincrement ids", async () => {
    const a: CustomExercise = { name: "Bulgarian Split Squat", muscle: "Legs" };
    const b: CustomExercise = { name: "Neck Bridge", muscle: "Neck" };
    const idA = await putCustomExercise(a);
    const idB = await putCustomExercise(b);
    expect(idB).toBeGreaterThan(idA);

    const all = await getCustomExercises();
    expect(all).toEqual([
      { ...a, id: idA },
      { ...b, id: idB },
    ]);
  });
});
