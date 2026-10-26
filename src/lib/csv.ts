import type { Workout } from "./db";
import { e1rm, isLoggedSet, setVolume } from "./stats";

/** Local calendar date as YYYY-MM-DD (toISOString would shift to UTC). */
function localDate(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * One row per logged set of each finished workout: date, exercise, set,
 * kg, reps, volume, e1rm, session duration in minutes. Raw values per
 * issue 04 rule 3 (rounding is display-time only); drafts are excluded.
 */
export function workoutsToCsv(workouts: Workout[]): string {
  const header = "date,exercise,set,kg,reps,volume,e1rm,duration_min";
  const rows: string[] = [];
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    if (w.endedAt === null) continue;
    const date = localDate(w.startedAt);
    const duration = ((w.endedAt - w.startedAt) / 60000).toFixed(1);
    for (const ex of w.exercises) {
      const name = `"${ex.name.replaceAll('"', '""')}"`;
      ex.sets.forEach((s, i) => {
        if (!isLoggedSet(s)) return;
        const kg = s.kg ?? 0;
        const reps = s.reps ?? 0;
        rows.push([date, name, i + 1, kg, reps, setVolume(s), e1rm(kg, reps), duration].join(","));
      });
    }
  }
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(workouts: Workout[]) {
  const today = localDate(Date.now()).replaceAll("-", "");
  // BOM so Excel reads UTF-8 names (custom exercises) correctly.
  const blob = new Blob([`\uFEFF${workoutsToCsv(workouts)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workouts-${today}.csv`;
  a.click();
  // Safari can abort the download if the URL dies before the click settles.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
