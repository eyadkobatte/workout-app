import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, putCustomExercise } from "../src/lib/db";
import { loadExercises } from "../src/lib/exercises";
import { MUSCLE_GROUPS, UNGROUPED } from "../src/lib/muscleGroups";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async () => {
  await closeDb();
  vi.unstubAllGlobals();
});

// The bundled library is irrelevant here; loadExercises fetches it, so serve
// an empty one and let the round-trip be about the custom exercises.
const emptyBundled = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => [] })),
  );

describe("custom exercise save→load round-trip", () => {
  it("keeps every canonical muscle group through storage (no silent Uncategorized)", async () => {
    emptyBundled();
    for (const group of MUSCLE_GROUPS) {
      await putCustomExercise({ name: `Custom ${group}`, muscle: group });
    }

    const loaded = await loadExercises();
    const customs = loaded.filter((e) => e.custom);
    expect(customs).toHaveLength(MUSCLE_GROUPS.length);
    for (const group of MUSCLE_GROUPS) {
      expect(customs.find((e) => e.name === `Custom ${group}`)?.category).toBe(group);
    }
  });

  it("still buckets unrecognized legacy free-text muscles (never reassigned)", async () => {
    emptyBundled();
    await putCustomExercise({ name: "Synaptic Strength", muscle: "mind melds" });

    const loaded = await loadExercises();
    expect(loaded.find((e) => e.name === "Synaptic Strength")?.category).toBe(UNGROUPED);
  });

  it("still recognizes legacy free-text spellings on reload", async () => {
    emptyBundled();
    await putCustomExercise({ name: "Barbell Row", muscle: "lats" });

    const loaded = await loadExercises();
    expect(loaded.find((e) => e.name === "Barbell Row")?.category).toBe("back");
  });
});
