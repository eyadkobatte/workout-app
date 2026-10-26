import { describe, expect, it } from "vitest";
import type { Workout } from "../src/lib/db";
import {
  bestSet,
  displayE1rm,
  displayVolume,
  durationMs,
  e1rm,
  effectiveValue,
  finishWorkout,
  formatElapsed,
  integerReps,
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

describe("bodyweight sets (issue 04 rule 2)", () => {
  it("adds 0 volume and e1RM 0, but counts in set/rep totals", () => {
    const set = { kg: 0, reps: 10 };
    expect(isLoggedSet(set)).toBe(true);
    expect(setVolume(set)).toBe(0);
    expect(e1rm(0, 10)).toBe(0);
  });
});

describe("effective values at Finish (issue 04 rule 6)", () => {
  it("uses the typed value, else the previous value, else 0", () => {
    expect(effectiveValue(22.5, 25)).toBe(22.5);
    expect(effectiveValue(null, 25)).toBe(25);
    expect(effectiveValue(null, null)).toBe(0);
    expect(effectiveValue(null, 0)).toBe(0); // previous bodyweight value stands
  });

  const draft: Workout = {
    id: 7,
    startedAt: 1_000,
    endedAt: null,
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { kg: 62.5, reps: null },
          { kg: null, reps: null },
        ],
      },
      {
        name: "Pull-Up",
        sets: [
          { kg: 0, reps: 10 },
          { kg: null, reps: 0 },
        ],
      },
      { name: "Squat", sets: [{ kg: null, reps: null }] }, // no history, untouched
    ],
  };
  const previous: Workout = {
    id: 6,
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

  it("materializes placeholders, drops unlogged rows and empty exercises, stamps endedAt", () => {
    const done = finishWorkout(draft, previous, 3_601_000);
    expect(done.endedAt).toBe(3_601_000);
    expect(done.id).toBe(7);
    expect(done.exercises).toEqual([
      {
        name: "Bench Press",
        sets: [
          { kg: 62.5, reps: 8 },
          { kg: 65, reps: 5 },
        ],
      },
      { name: "Pull-Up", sets: [{ kg: 0, reps: 10 }] },
    ]);
  });

  it("stores decimal kg verbatim and keeps hand-computed stats correct", () => {
    const done = finishWorkout(draft, previous, 3_601_000);
    expect(done.exercises[0]?.sets[0]?.kg).toBe(62.5); // 62.5, not rounded
    expect(workoutVolume(done)).toBe(62.5 * 8 + 65 * 5 + 0 * 10);
    expect(workoutSetCount(done)).toBe(3);
    expect(workoutRepCount(done)).toBe(8 + 5 + 10);
  });
});

describe("integer reps (issue 04 rule 3)", () => {
  it("truncates decimal entry", () => {
    expect(integerReps(7.9)).toBe(7);
    expect(integerReps(8)).toBe(8);
    expect(integerReps(0)).toBe(0);
  });
});

describe("display rounding (issue 04 rule 3)", () => {
  it("rounds volume to whole kg and e1RM to 1 decimal", () => {
    expect(displayVolume(805.6)).toBe(806);
    expect(displayVolume(825)).toBe(825);
    expect(displayE1rm(e1rm(60, 8))).toBe(76); // 76.0 exactly
    expect(displayE1rm(e1rm(65, 5))).toBeCloseTo(75.8, 10);
  });
});

describe("elapsed clock (issue 04 rule 5)", () => {
  it("shows m:ss under an hour and h:mm:ss past it", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(3_599_000)).toBe("59:59");
    expect(formatElapsed(3_600_000)).toBe("1:00:00");
    expect(formatElapsed(3_661_000)).toBe("1:01:01");
  });
});

describe("best set (LAST/BEST chips)", () => {
  it("picks the set with the highest e1RM", () => {
    // 60×8 → 76.0 beats 65×5 → 75.8 despite the lighter weight.
    expect(
      bestSet([
        { kg: 60, reps: 8 },
        { kg: 65, reps: 5 },
      ]),
    ).toEqual({ kg: 60, reps: 8 });
  });

  it("never picks a bodyweight or unlogged set", () => {
    expect(
      bestSet([
        { kg: 0, reps: 10 },
        { kg: 60, reps: 5 },
      ]),
    ).toEqual({ kg: 60, reps: 5 });
    expect(
      bestSet([
        { kg: null, reps: null },
        { kg: 40, reps: 10 },
      ]),
    ).toEqual({ kg: 40, reps: 10 });
  });

  it("returns null with no candidates", () => {
    expect(bestSet([])).toBeNull();
    expect(bestSet([{ kg: null, reps: null }])).toBeNull();
  });
});
