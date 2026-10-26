import type { Workout } from "./db";
import { durationMs, e1rm, isLoggedSet, setVolume } from "./stats";

/** One row per logged set: date, exercise, set #, kg, reps, volume, e1RM, session duration. */
export function workoutsToCsv(workouts: Workout[]): string {
  const header = "date,exercise,set,kg,reps,volume,e1rm,duration_min";
  const rows: string[] = [];
  for (const w of workouts) {
    const date = new Date(w.startedAt).toISOString().slice(0, 10);
    const dur = durationMs(w);
    const durMin = dur === null ? "" : (dur / 60000).toFixed(1);
    for (const ex of w.exercises) {
      ex.sets.forEach((s, i) => {
        if (!isLoggedSet(s)) return;
        const kg = s.kg ?? 0;
        const reps = s.reps ?? 0;
        const name = `"${ex.name.replaceAll('"', '""')}"`;
        rows.push(
          [date, name, i + 1, kg, reps, setVolume(s), e1rm(kg, reps).toFixed(1), durMin].join(","),
        );
      });
    }
  }
  return [header, ...rows].join("\n");
}

export function downloadCsv(workouts: Workout[]) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const blob = new Blob([workoutsToCsv(workouts)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workouts-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
