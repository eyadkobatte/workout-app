import { describe, expect, it } from "vitest";
import { workoutsToCsv } from "../src/lib/csv";
import type { Workout } from "../src/lib/db";
import { e1rm } from "../src/lib/stats";

// Local noon so the expected local date holds in any timezone.
const startedAt = new Date(2026, 9, 26, 12, 0).getTime();
const hourMs = 60 * 60 * 1000;

const done: Workout = {
  id: 1,
  startedAt,
  endedAt: startedAt + hourMs,
  exercises: [
    {
      name: "Bench Press",
      sets: [
        { kg: 60, reps: 8 },
        { kg: 12.45, reps: 5 },
      ],
    },
    { name: 'Weird, "Name"', sets: [{ kg: 0, reps: 10 }] },
    { name: "Empty", sets: [{ kg: null, reps: null }] },
  ],
};
const draft: Workout = {
  id: 2,
  startedAt: 0,
  endedAt: null, // in progress — never exported
  exercises: [{ name: "Draft", sets: [{ kg: 100, reps: 5 }] }],
};

const csv = workoutsToCsv([draft, done]);
const lines = csv.split("\r\n");

describe("workoutsToCsv", () => {
  it("emits the plan's eight columns and one row per logged set", () => {
    expect(lines[0]).toBe("date,exercise,set,kg,reps,volume,e1rm,duration_min");
    expect(lines).toHaveLength(4); // header + 2 bench rows + 1 weird row
  });

  it("skips drafts and unlogged sets, keeps set numbers contiguous", () => {
    expect(csv).not.toContain("Draft");
    expect(csv).not.toContain("Empty");
    expect(lines[1]).toBe(`2026-10-26,"Bench Press",1,60,8,480,${e1rm(60, 8)},60.0`);
    expect(lines[2]).toBe(`2026-10-26,"Bench Press",2,12.45,5,62.25,${e1rm(12.45, 5)},60.0`);
  });

  it("uses raw values, not display rounding", () => {
    expect(csv).not.toContain("76.0,"); // e1RM not toFixed(1)
    expect(lines[2]?.split(",")[5]).toBe("62.25"); // 12.45 × 5 verbatim
  });

  it("scores bodyweight sets zero", () => {
    expect(lines[3]).toBe('2026-10-26,"Weird, ""Name""",1,0,10,0,0,60.0');
  });

  it("escapes commas and quotes in exercise names", () => {
    expect(csv).toContain('"Weird, ""Name"""');
  });

  it("uses the local calendar date", () => {
    expect(csv).toContain("2026-10-26");
  });
});
