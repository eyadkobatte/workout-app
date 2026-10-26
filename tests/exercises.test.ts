import { describe, expect, it } from "vitest";
import { categoryList, type ExerciseInfo } from "../src/lib/exercises";

const ex = (name: string, muscle: string): ExerciseInfo => ({
  id: name,
  name,
  muscle,
  equipment: "",
});

describe("categoryList", () => {
  it("groups exercises by muscle with counts, sorted", () => {
    const list = categoryList([ex("Bench", "Chest"), ex("Fly", "Chest"), ex("Deadlift", "Back")]);
    expect(list).toEqual([
      { muscle: "Back", count: 1 },
      { muscle: "Chest", count: 2 },
    ]);
  });

  it("caches per source list and regenerates for a new list", () => {
    const a = categoryList([ex("Bench", "Chest")]);
    const b = categoryList([ex("Plank", "Abs")]);
    expect(b).toEqual([{ muscle: "Abs", count: 1 }]);
    expect(a).not.toBe(b);
  });
});
