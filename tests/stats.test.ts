import { describe, expect, it } from "vitest";
import type { Workout } from "../src/lib/db";
import {
  durationMs,
  e1rm,
  isLoggedSet,
  setVolume,
  workoutRepCount,
  workoutSetCount,
  workoutVolume,
} from "../src/lib/stats";

const workout: Workout = {
  id: 1,
  startedAt: 1_000,
  endedAt: 3_601_000,
  exercises: [
    {
      name: "Bench Press",
      sets: [
        { kg: 60, reps: 8 },
        { kg: 65, reps: 5 },
        { kg: null, reps: null }, // not logged
      ],
    },
    {
      name: "Pull-Up",
      sets: [{ kg: 0, reps: 10 }], // bodyweight
    },
  ],
};

describe("stats", () => {
  it("a set is logged when reps > 0", () => {
    expect(isLoggedSet({ kg: 20, reps: 5 })).toBe(true);
    expect(isLoggedSet({ kg: 0, reps: 8 })).toBe(true); // bodyweight
    expect(isLoggedSet({ kg: 20, reps: 0 })).toBe(false);
    expect(isLoggedSet({ kg: null, reps: null })).toBe(false);
  });

  it("estimates 1RM with the Epley formula", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
    expect(e1rm(60, 0)).toBe(0);
  });

  it("computes set volume only for logged sets", () => {
    expect(setVolume({ kg: 60, reps: 8 })).toBe(480);
    expect(setVolume({ kg: null, reps: null })).toBe(0);
  });

  it("computes workout totals", () => {
    expect(workoutVolume(workout)).toBe(60 * 8 + 65 * 5 + 0 * 10);
    expect(workoutSetCount(workout)).toBe(3);
    expect(workoutRepCount(workout)).toBe(8 + 5 + 10);
  });

  it("computes session duration", () => {
    expect(durationMs(workout)).toBe(3_600_000);
    expect(durationMs({ ...workout, endedAt: null })).toBeNull();
  });
});
