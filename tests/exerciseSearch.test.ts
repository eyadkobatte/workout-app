import { describe, expect, it } from "vitest";
import {
  createExerciseSearch,
  searchExercises,
  normalizeExerciseName,
} from "../src/lib/exerciseSearch";
import type { ExerciseInfo } from "../src/lib/exercises";
import type { ExerciseUsage } from "../src/lib/exerciseUsage";

const now = Date.parse("2026-01-01T00:00:00.000Z");
const dayMs = 24 * 60 * 60 * 1000;
const on = (n: number) => now - n * dayMs;

const exercises: ExerciseInfo[] = [
  { id: "bench-press", name: "Bench Press", muscle: "", equipment: "", category: "chest" },
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    muscle: "",
    equipment: "",
    category: "chest",
  },
  {
    id: "incline-bench-press",
    name: "Incline Bench Press",
    muscle: "",
    equipment: "",
    category: "chest",
  },
  { id: "bicep-bench", name: "Bicep Bench", muscle: "", equipment: "", category: "biceps" },
  {
    id: "dumbbell-row",
    name: "Dumbbell Row",
    muscle: "",
    equipment: "dumbbell",
    category: "back",
  },
  {
    id: "custom-variation",
    name: "Custom Bench Jam",
    muscle: "",
    equipment: "",
    category: "chest",
    custom: true,
  },
];

const source = createExerciseSearch(exercises);

const benchSource = createExerciseSearch([
  { id: "bench-dips", name: "Bench Dips", muscle: "", equipment: "", category: "chest" },
  { id: "bench-jump", name: "Bench Jump", muscle: "", equipment: "", category: "legs" },
  { id: "bench-sprint", name: "Bench Sprint", muscle: "", equipment: "", category: "legs" },
  {
    id: "bench-powerlifting",
    name: "Bench Press - Powerlifting",
    muscle: "",
    equipment: "",
    category: "chest",
  },
  {
    id: "bench-bands",
    name: "Bench Press - With Bands",
    muscle: "",
    equipment: "",
    category: "chest",
  },
  {
    id: "bench-chains",
    name: "Bench Press - With Chains",
    muscle: "",
    equipment: "",
    category: "chest",
  },
  {
    id: "barbell-medium",
    name: "Barbell Bench Press - Medium Grip",
    muscle: "",
    equipment: "",
    category: "chest",
  },
]);

// Equal shape avoids BM25 length differences when checking history-only order.
const prefixSource = createExerciseSearch([
  { id: "prefix-used", name: "Bench Jam", muscle: "", equipment: "", category: "chest" },
  { id: "prefix-unused", name: "Bench Ask", muscle: "", equipment: "", category: "chest" },
  { id: "prefix-recency", name: "Bench Old", muscle: "", equipment: "", category: "chest" },
]);

const used = (sessionCount: number, lastUsedAt = now): ExerciseUsage => ({
  sessionCount,
  lastUsedAt,
});

const names = (results: ReturnType<typeof searchExercises>) => results.map((r) => r.exercise.name);

const usageFromNames = (usage: [string, ExerciseUsage][]) => new Map(usage);

describe("normalizeExerciseName", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeExerciseName("  Bench    Press ")).toBe("bench press");
  });
});

describe("searchExercises", () => {
  it("ranks an exact text match above a much more used weaker match", () => {
    const usage = usageFromNames([
      ["Barbell Bench Press", used(90, on(1))],
      ["Incline Bench Press", used(20, on(1))],
    ]);
    const results = searchExercises(source, "bench press", usage, now);
    expect(names(results)).toEqual(["Bench Press", "Barbell Bench Press", "Incline Bench Press"]);
    expect(results[0].matchTier).toBe(3);
    expect(results[0].historyBoost).toBe(0);
    expect(results[1].matchTier).toBe(2);
    expect(results[2].matchTier).toBe(2);
  });

  it("ranks a previously logged variation above comparable unused bench matches", () => {
    const usage = usageFromNames([
      ["Barbell Bench Press - Medium Grip", used(2, on(1))],
      // A separate high-usage exercise keeps the history normalization realistic.
      ["Dumbbell Row", used(30, on(1))],
    ]);
    const results = searchExercises(benchSource, "bench", usage, now);
    expect(names(results)[0]).toBe("Barbell Bench Press - Medium Grip");
    expect(results[0].matchTier).toBe(2);
    expect(results[0].historyBoost).toBeGreaterThan(0);
  });

  it("boosts a frequently used exercise within the same match tier", () => {
    const usage = usageFromNames([
      ["Bench Jam", used(30, on(1))],
      ["Bench Again", used(1, on(1))],
      ["Bench Old", used(3, on(1))],
    ]);
    const results = searchExercises(prefixSource, "bench", usage, now);
    expect(names(results)[0]).toBe("Bench Jam");
    expect(names(results)[1]).toBe("Bench Old");
    expect(names(results)[2]).toBe("Bench Ask");
    expect(results[0].matchTier).toBe(2);
  });

  it("breaks otherwise identical usage by recency", () => {
    const usage = usageFromNames([
      ["Bench Jam", used(5, on(1))],
      ["Bench Old", used(5, on(80))],
    ]);
    const results = searchExercises(prefixSource, "bench", usage, now);
    expect(names(results)[0]).toBe("Bench Jam");
    expect(names(results)[1]).toBe("Bench Old");
  });

  it("exercises without history receive no boost", () => {
    const results = searchExercises(source, "bench press", new Map(), now);
    expect(
      results.filter((r) => r.exercise.name === "Bench Press").every((r) => r.matchTier === 3),
    ).toBe(true);
    expect(
      results
        .filter((r) => r.exercise.name !== "Bench Press")
        .every((r) => r.matchTier < 3 && r.historyBoost === 0),
    ).toBe(true);
  });

  it("requires all query words to match prefix-style", () => {
    expect(names(searchExercises(source, "bench row", new Map(), now))).toEqual([]);
  });

  it("does not use fuzzy matching for short terms", () => {
    expect(names(searchExercises(source, "jmp", new Map(), now))).toEqual([]);
  });

  it("keeps an exact match above a heavily used weaker match", () => {
    const usage = usageFromNames([
      ["Barbell Bench Press", used(90, now - 1000)],
      ["Incline Bench Press", used(60, now - 1000)],
    ]);
    const results = searchExercises(source, "bench press", usage, now);
    expect(names(results)).toEqual(["Bench Press", "Barbell Bench Press", "Incline Bench Press"]);
    expect(results[0].matchTier).toBe(3);
    expect(results[1].matchTier).toBe(2);
  });

  it("keeps fuzzy matches below full query-word matches", () => {
    const usage = usageFromNames([["Bench Press", used(99, now)]]);
    const results = searchExercises(source, "bench jaim", usage, now);
    expect(names(results)).toEqual(["Custom Bench Jam"]);
    expect(results[0].matchTier).toBe(1);
    expect(results[0].historyBoost).toBe(0);
  });

  it("uses light fuzzy behavior for three or more characters", () => {
    expect(names(searchExercises(source, "bench jaim", new Map(), now))).toEqual([
      "Custom Bench Jam",
    ]);
  });

  it("does not search metadata fields or non-name data", () => {
    expect(searchExercises(source, "cable triceps", new Map(), now)).toEqual([]);
  });

  it("includes custom exercises in name search", () => {
    expect(names(searchExercises(source, "custom bench jam", new Map(), now))).toEqual([
      "Custom Bench Jam",
    ]);
  });
});
