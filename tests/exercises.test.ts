import { describe, expect, it } from "vitest";
import { categoryList, type ExerciseInfo } from "../src/lib/exercises";
import { MUSCLE_GROUPS, groupLabel, normalizeMuscle } from "../src/lib/muscleGroups";

const ex = (name: string, category: ExerciseInfo["category"]): ExerciseInfo => ({
  id: name,
  name,
  muscle: category,
  equipment: "",
  category,
});

describe("normalizeMuscle", () => {
  it("maps every free-exercise-db muscle onto the taxonomy", () => {
    const dataset: [string, (typeof MUSCLE_GROUPS)[number]][] = [
      ["shoulders", "shoulders"],
      ["traps", "shoulders"],
      ["neck", "shoulders"],
      ["chest", "chest"],
      ["biceps", "biceps"],
      ["forearms", "biceps"],
      ["triceps", "triceps"],
      ["lats", "back"],
      ["lower back", "back"],
      ["middle back", "back"],
      ["quadriceps", "legs"],
      ["hamstrings", "legs"],
      ["calves", "legs"],
      ["glutes", "legs"],
      ["abductors", "legs"],
      ["adductors", "legs"],
      ["abdominals", "core"],
    ];
    for (const [source, expected] of dataset) {
      expect(normalizeMuscle(source)).toBe(expected);
    }
  });

  it("is case- and whitespace-insensitive and covers common spellings", () => {
    expect(normalizeMuscle("  BICEPS ")).toBe("biceps");
    expect(normalizeMuscle("Abs")).toBe("core");
    expect(normalizeMuscle("Quads")).toBe("legs");
    expect(normalizeMuscle("Upper Back")).toBe("back");
  });

  it("returns null for unrecognized values (legacy customs stay grouped later)", () => {
    expect(normalizeMuscle("synaptic strength")).toBe(null);
  });
});

describe("groupLabel", () => {
  it("capitalizes including the legacy bucket", () => {
    expect(groupLabel("biceps")).toBe("Biceps");
    expect(groupLabel("uncategorized")).toBe("Uncategorized");
  });
});

describe("categoryList", () => {
  it("groups by category with counts, in taxonomy order, omitting empty groups", () => {
    const list = categoryList([
      ex("Curl", "biceps"),
      ex("Hammer Curl", "biceps"),
      ex("Deadlift", "back"),
    ]);
    expect(list).toEqual([
      { category: "biceps", label: "Biceps", count: 2 },
      { category: "back", label: "Back", count: 1 },
    ]);
  });

  it("appends a legacy uncategorized bucket last when present", () => {
    const list = categoryList([ex("Bench", "chest"), ex("Mystery Move", "uncategorized")]);
    expect(list).toEqual([
      { category: "chest", label: "Chest", count: 1 },
      { category: "uncategorized", label: "Uncategorized", count: 1 },
    ]);
  });

  it("caches per source list and regenerates for a new list", () => {
    const a = categoryList([ex("Bench", "chest")]);
    const b = categoryList([ex("Plank", "core")]);
    expect(b).toEqual([{ category: "core", label: "Core", count: 1 }]);
    expect(a).not.toBe(b);
  });
});
