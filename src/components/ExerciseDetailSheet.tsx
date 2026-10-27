import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Chip } from "./ExerciseCard";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { LineChart } from "./LineChart";
import { Sheet, SheetTitle } from "./ui/sheet";
import { getWorkouts, type Workout } from "../lib/db";
import { exerciseImageUrls, loadExercises, type ExerciseInfo } from "../lib/exercises";
import {
  bestSet,
  displayE1rm,
  displayVolume,
  sessionMetrics,
  sessionSets,
  type SessionMetrics,
} from "../lib/stats";
import { cn } from "../lib/utils";

const CHARTS: {
  title: string;
  pick: (m: SessionMetrics) => number;
  format: (v: number) => string;
}[] = [
  { title: "Volume", pick: (m) => m.volume, format: (v) => `${displayVolume(v)} kg` },
  { title: "Total reps", pick: (m) => m.reps, format: (v) => String(v) },
  { title: "Total sets", pick: (m) => m.setCount, format: (v) => String(v) },
  { title: "Est. 1RM", pick: (m) => m.bestE1rm, format: (v) => `${displayE1rm(v)} kg` },
];

/** Two hosted frames alternated ~0.8s — GIF-like without storing anything. */
function ExerciseImage({ id }: { id: string }) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [failed, setFailed] = useState(false);
  const urls = exerciseImageUrls(id);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 800);
    return () => clearInterval(timer);
  }, []);

  if (failed) return null;
  return (
    <div className="relative h-56 overflow-hidden rounded-lg border border-border bg-card">
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          loading="eager"
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
            frame === i ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}

function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-base font-semibold">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export interface ExerciseDetailViewProps {
  name: string;
  /** Sheet/route close control. */
  onBack: () => void;
  /** When omitted, history rows stay readable but cannot navigate (workout sheet). */
  onOpenWorkout?: (workoutId: number) => void;
  /** Workout-sheet add action; omitted on the standalone route. */
  onAdd?: () => void;
  addDisabled?: boolean;
}

export function ExerciseDetailView({
  name,
  onBack,
  onOpenWorkout,
  onAdd,
  addDisabled,
}: ExerciseDetailViewProps) {
  const [info, setInfo] = useState<ExerciseInfo | null | undefined>(undefined); // undefined = loading
  const [history, setHistory] = useState<Workout[]>([]); // finished, containing this exercise

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // The library lookup is optional — charts and history only need logged data.
      const [library, all] = await Promise.all([loadExercises().catch(() => null), getWorkouts()]);
      if (cancelled) return;
      setInfo(library?.find((e) => e.name === name) ?? null);
      setHistory(
        all.filter((w) => w.endedAt !== null && w.exercises.some((x) => x.name === name)).reverse(),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const series = useMemo(() => history.map((w) => sessionMetrics(w, name)), [history, name]);
  const labels = useMemo(
    () =>
      history.map((w) =>
        new Date(w.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ),
    [history],
  );

  if (info === undefined) return null;

  const totals = series.reduce(
    (acc, m) => ({
      volume: acc.volume + m.volume,
      reps: acc.reps + m.reps,
      setCount: acc.setCount + m.setCount,
      bestE1rm: Math.max(acc.bestE1rm, m.bestE1rm),
    }),
    { volume: 0, reps: 0, setCount: 0, bestE1rm: 0 },
  );
  const bestEver = bestSet(history.flatMap((w) => sessionSets(w, name)));

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{name}</h1>
        {bestEver && (
          <Chip label="Best" value={`${bestEver.kg ?? 0}×${bestEver.reps ?? 0}`} accent />
        )}
      </header>

      {info && !info.custom && <ExerciseImage id={info.id} />}
      {info === null && (
        <p className="text-sm text-muted-foreground">
          Not in the library — showing logged data only.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-card py-3 text-center">
        <StatCell label="Sessions" value={String(history.length)} />
        <StatCell label="Volume" value={String(displayVolume(totals.volume))} unit="kg" />
        <StatCell label="Sets" value={String(totals.setCount)} />
        <StatCell label="Reps" value={String(totals.reps)} />
      </div>

      {CHARTS.map((chart) => (
        <Card key={chart.title} className="p-3">
          <LineChart
            title={chart.title}
            values={series.map(chart.pick)}
            labels={labels}
            format={chart.format}
          />
        </Card>
      ))}

      <div className="rounded-lg border border-border bg-card px-2 py-1">
        <h2 className="px-1 py-2 text-sm font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="px-1 pb-3 text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          history.map((w, i) => {
            const metrics = series[i];
            const best = bestSet(sessionSets(w, name));
            const openWorkout = () => onOpenWorkout?.(w.id ?? NaN);
            const rowClass =
              "flex h-11 w-full items-baseline justify-between gap-2 border-b border-border px-1 text-left last:border-b-0";
            return onOpenWorkout ? (
              <button
                key={w.id}
                type="button"
                onClick={openWorkout}
                className={`${rowClass} hover:bg-muted/50`}
              >
                <span className="shrink-0 text-sm">{labels[i]}</span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {metrics.setCount} sets · {displayVolume(metrics.volume)} kg
                  {best ? ` · best ${best.kg ?? 0}×${best.reps ?? 0}` : ""}
                </span>
              </button>
            ) : (
              <div key={w.id} className={rowClass}>
                <span className="shrink-0 text-sm">{labels[i]}</span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {metrics.setCount} sets · {displayVolume(metrics.volume)} kg
                  {best ? ` · best ${best.kg ?? 0}×${best.reps ?? 0}` : ""}
                </span>
              </div>
            );
          })
        )}
      </div>

      {onAdd && (
        <div className="sticky bottom-4 pt-2">
          <Button className="w-full shadow-lg" onClick={onAdd} disabled={addDisabled}>
            Add exercise
          </Button>
        </div>
      )}
    </div>
  );
}

/** Full-screen presentation of `ExerciseDetailView` over the workout flow. */
export function ExerciseDetailSheet({
  open,
  name,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  name: string;
  onOpenChange: (open: boolean) => void;
  /** Omitted when opened from an active exercise title. */
  onAdd?: () => void;
}) {
  return (
    <Sheet variant="full" open={open} onOpenChange={onOpenChange}>
      <div className="mx-auto flex h-full max-w-lg flex-col">
        <header className="flex items-center gap-2 border-b border-border px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close details"
          >
            <ChevronLeft />
          </Button>
          <SheetTitle className="min-w-0 flex-1 truncate text-left text-lg font-semibold">
            {name}
          </SheetTitle>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <ExerciseDetailView name={name} onBack={() => onOpenChange(false)} onAdd={onAdd} />
        </div>
      </div>
    </Sheet>
  );
}
