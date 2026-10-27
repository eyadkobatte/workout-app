import { describe, expect, it } from "vitest";
import type { Workout } from "../src/lib/db";
import {
  buildExerciseUsage,
  previouslyLogged,
  splitCategoryExercises,
} from "../src/lib/exerciseUsage";
import type { ExerciseInfo } from "../src/lib/exercises";

const workout = (endedAt: number | null, exercises: Workout["exercises"]): Workout => ({
  startedAt: endedAt === null ? 0 : endedAt - 60_000,
  endedAt,
  exercises,
});

const ex = (name: string, category: ExerciseInfo["category"] = "chest"): ExerciseInfo => ({
  id: name,
  name,
  muscle: category,
  equipment: "",
  category,
});

// Recency days derived against a stable "now" timestamp.
const NOW = 9 * 24 * 60 * 60 * 1000;
const day = (n: number) => NOW - n * 24 * 60 * 60 * 1000;

describe("buildExerciseUsage", () => {
  it("counts finished logged exercises once each and keeps exact variations distinct", () => {
    const usage = buildExerciseUsage([
      workout(day(4), [
        {
          name: "Bench Press",
          sets: [
            { kg: 60, reps: 5 },
            { kg: null, reps: 0 },
          ],
        },
      ]),
      workout(day(2), [{ name: "Bench Press", sets: [{ kg: 70, reps: 3 }] }]),
      workout(day(1), [{ name: "Incline Bench Press", sets: [{ kg: 50, reps: 8 }] }]),
    ]);
    expect(usage.get("Bench Press")).toEqual({
      sessionCount: 2,
      lastUsedAt: day(2) - 60_000,
    });
    expect(usage.get("Incline Bench Press")?.sessionCount).toBe(1);
  });

  it("ignores drafts and finished exercises with no logged sets", () => {
    const usage = buildExerciseUsage([
      workout(null, [{ name: "Draft Row", sets: [{ kg: 100, reps: 8 }] }]),
      workout(day(1), [
        {
          name: "Empty Row",
          sets: [
            { kg: null, reps: 0 },
            { kg: null, reps: null },
          ],
        },
      ]),
    ]);
    expect(usage.has("Draft Row")).toBe(false);
    expect(usage.has("Empty Row")).toBe(false);
  });

  it("returns an empty map without history", () => {
    expect(buildExerciseUsage([]).size).toBe(0);
  });
});

describe("splitCategoryExercises", () => {
  const names = [
    "Bench Press",
    "Barbell Bench Press",
    "Incline Bench Press",
    "Chest Dip",
    "Push Up",
    "Machine Press",
  ];

  it("puts the five most-used exercises first, then the rest alphabetically", () => {
    const usage = new Map(
      names.map((name, i) => [
        name,
        {
          sessionCount: i + 1,
          lastUsedAt: NOW,
        },
      ]),
    );
    const split = splitCategoryExercises(
      names.map((name) => ex(name)),
      usage,
    );
    expect(split.doneBefore.map((e) => e.name)).toEqual([
      "Machine Press",
      "Push Up",
      "Chest Dip",
      "Incline Bench Press",
      "Barbell Bench Press",
    ]);
    expect(split.otherExercises).toEqual([ex(names[0])]);
  });

  it("caps Done before at five and keeps later used exercises as Other with history", () => {
    const usage = new Map(
      names.map((name, i) => [
        name,
        {
          sessionCount: i + 1,
          lastUsedAt: NOW - i * 60_000,
        },
      ]),
    );
    const split = splitCategoryExercises(
      names.map((name) => ex(name)),
      usage,
    );
    expect(split.doneBefore).toHaveLength(5);
    expect(split.otherExercises).toEqual([ex(names[0])]);
    expect(previouslyLogged(usage, names[0])?.sessionCount).toBe(1);
  });

  it("breaks equal usage by recency and name", () => {
    const usage = new Map([
      [names[0], { sessionCount: 3, lastUsedAt: day(6) }],
      [names[1], { sessionCount: 3, lastUsedAt: day(1) }],
      [names[2], { sessionCount: 2, lastUsedAt: day(0) }],
      [names[3], { sessionCount: 2, lastUsedAt: day(9) }],
      [names[4], { sessionCount: 0, lastUsedAt: 0 }],
    ]);
    const split = splitCategoryExercises(
      names.map((name) => ex(name)),
      usage,
    );
    expect(split.doneBefore.map((e) => e.name)).toEqual([names[1], names[0], names[2], names[3]]);
    expect(split.otherExercises.map((e) => e.name)).toEqual([names[5], names[4]]);
  });

  it("returns an alphabetical list when nothing was logged before", () => {
    const split = splitCategoryExercises(
      names.map((name) => ex(name)),
      buildExerciseUsage([]),
    );
    expect([...split.doneBefore, ...split.otherExercises].map((e) => e.name)).toEqual(
      [...names].sort((a, b) => a.localeCompare(b)),
    );
  });
});
