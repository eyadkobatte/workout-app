import { describe, expect, it } from "vitest";
import type { Workout } from "../src/lib/db";
import { resolveExerciseContext, sessionMetrics, sessionSets } from "../src/lib/placeholder";
import { e1rm } from "../src/lib/stats";

// History fixtures: finished workouts only, oldest first — the resolver's
// input contract (callers pre-filter; the resolver never checks endedAt).
const early: Workout = {
  id: 1,
  startedAt: 0,
  endedAt: 10,
  exercises: [
    { name: "Bench", sets: [{ kg: 60, reps: 8 }] }, // e1RM 76 — the all-time best
    { name: "Row", sets: [{ kg: 60, reps: 8 }] },
  ],
};
const late: Workout = {
  id: 2,
  startedAt: 100,
  endedAt: 200,
  exercises: [{ name: "Bench", sets: [{ kg: 65, reps: 5 }] }], // e1RM 75.8
};
const history: Workout[] = [early, late];

describe("resolveExerciseContext — the Placeholder rule in one place", () => {
  it("resolves the previous session's sets for positional matching", () => {
    expect(resolveExerciseContext(history, "Bench").previousSets).toEqual([{ kg: 65, reps: 5 }]);
  });

  it("picks each exercise's own most recent session, not one shared previous workout", () => {
    expect(resolveExerciseContext(history, "Row").previousSets).toEqual([{ kg: 60, reps: 8 }]);
  });

  it("derives LAST from the previous session and BEST across every session", () => {
    const { lastBest, bestEver } = resolveExerciseContext(history, "Bench");
    expect(lastBest).toEqual({ kg: 65, reps: 5 });
    // 60×8 → e1RM 76.0 beats 65×5 → 75.8 despite the lighter weight.
    expect(bestEver).toEqual({ kg: 60, reps: 8 });
  });

  it("returns nothing for an exercise with no history", () => {
    expect(resolveExerciseContext(history, "Squat")).toEqual({
      previousSets: null,
      lastBest: null,
      bestEver: null,
    });
    expect(resolveExerciseContext([], "Bench").previousSets).toBeNull();
  });
});

describe("session helpers (prev column, chart series)", () => {
  const w: Workout = {
    id: 1,
    startedAt: 0,
    endedAt: 10,
    exercises: [
      {
        name: "Bench",
        sets: [
          { kg: 60, reps: 8 },
          { kg: 65, reps: 5 },
          { kg: null, reps: null },
        ],
      },
      { name: "Pull-Up", sets: [{ kg: 0, reps: 10 }] },
    ],
  };

  it("returns the logged sets of the named exercise in one workout", () => {
    expect(sessionSets(w, "Bench")).toEqual([
      { kg: 60, reps: 8 },
      { kg: 65, reps: 5 },
    ]);
    expect(sessionSets(w, "Squat")).toEqual([]);
  });

  it("sums volume/reps/sets and picks the best e1RM for one exercise", () => {
    expect(sessionMetrics(w, "Bench")).toEqual({
      volume: 60 * 8 + 65 * 5,
      reps: 13,
      setCount: 2,
      bestE1rm: e1rm(60, 8), // 76.0 beats 75.8
    });
  });

  it("scores bodyweight sets zero on volume and e1RM", () => {
    expect(sessionMetrics(w, "Pull-Up")).toEqual({
      volume: 0,
      reps: 10,
      setCount: 1,
      bestE1rm: 0,
    });
  });

  it("flatlines for unknown exercises", () => {
    expect(sessionMetrics(w, "Squat")).toEqual({
      volume: 0,
      reps: 0,
      setCount: 0,
      bestE1rm: 0,
    });
  });
});
