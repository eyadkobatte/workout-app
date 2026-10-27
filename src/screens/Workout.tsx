import { ChevronLeft, Plus } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ExerciseCard, type ExerciseCardProps } from "../components/ExerciseCard";
import { ExerciseDetailSheet } from "../components/ExerciseDetailSheet";
import { ExercisePicker } from "../components/ExercisePicker";
import { Button } from "../components/ui/button";
import {
  deleteWorkout,
  getWorkout,
  getWorkouts,
  putWorkout,
  type Workout as WorkoutDoc,
  type WorkoutExercise,
} from "../lib/db";
import { navigate } from "../lib/router";
import {
  bestSet,
  displayVolume,
  durationMs,
  exerciseSets,
  finishWorkout,
  formatElapsed,
  lastSession,
  sessionSets,
  workoutRepCount,
  workoutSetCount,
  workoutVolume,
} from "../lib/stats";
import { useNow } from "../lib/useNow";

/** One card in the drag-reorder list, handle-only drag. */
function ExerciseItem(props: Omit<ExerciseCardProps, "onDragStart">) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={props.exercise}
      dragListener={false}
      dragControls={controls}
      className="list-none"
    >
      <ExerciseCard {...props} onDragStart={(event) => controls.start(event)} />
    </Reorder.Item>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Finished({ workout, onDelete }: { workout: WorkoutDoc; onDelete: () => void }) {
  const date = new Date(workout.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const duration = durationMs(workout);
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold">{date}</h1>
          <p className="text-xs text-muted-foreground">
            {duration !== null ? formatElapsed(duration) : "in progress"} ·{" "}
            {workoutSetCount(workout)} sets
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 rounded-lg border border-border bg-card py-3 text-center">
        <Stat label="Volume" value={`${displayVolume(workoutVolume(workout))} kg`} />
        <Stat label="Sets" value={String(workoutSetCount(workout))} />
        <Stat label="Reps" value={String(workoutRepCount(workout))} />
      </div>

      {workout.exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing logged.</p>
      )}
      {workout.exercises.map((exercise) => (
        <div key={exercise.name} className="rounded-lg border border-border bg-card px-2 py-1">
          <h2 className="px-1 py-2 text-sm font-semibold">{exercise.name}</h2>
          {exercise.sets.map((set, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.25rem_1fr] items-center gap-1 border-b border-border text-sm last:border-b-0"
            >
              <span className="text-xs text-muted-foreground">{i + 1}</span>
              <span className="font-semibold">
                {set.kg ?? 0} × {set.reps ?? 0}
              </span>
            </div>
          ))}
        </div>
      ))}

      <Button variant="destructive" className="w-full" onClick={onDelete}>
        Delete workout
      </Button>
    </div>
  );
}

export function Workout({ id }: { id: string }) {
  const isNew = id === "new";
  const [workout, setWorkout] = useState<WorkoutDoc | null>(null);
  const [history, setHistory] = useState<WorkoutDoc[]>([]); // finished, excluding this one
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailName, setDetailName] = useState<string | null>(null);
  const creationRef = useRef<Promise<WorkoutDoc> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isNew) {
        // StrictMode double-fires mount effects in dev — share one draft-
        // creation promise so the write happens exactly once. Both runs await
        // it; the run whose closure isn't cancelled applies the state.
        creationRef.current ??= (async () => {
          const draft: WorkoutDoc = { startedAt: Date.now(), endedAt: null, exercises: [] };
          const newId = await putWorkout(draft);
          return { ...draft, id: newId };
        })();
        const saved = await creationRef.current;
        if (cancelled) return;
        setWorkout(saved);
        navigate(`/workout/${saved.id ?? 0}`, { replace: true });
        return;
      }
      const [loaded, all] = await Promise.all([getWorkout(Number(id)), getWorkouts()]);
      if (cancelled) return;
      if (!loaded) {
        navigate("/", { replace: true });
        return;
      }
      setWorkout(loaded);
      setHistory(all.filter((w) => w.endedAt !== null && w.id !== loaded.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Autosave on every change — a draft is never lost to a killed app.
  useEffect(() => {
    if (workout) void putWorkout(workout);
  }, [workout]);

  const now = useNow(1000);

  if (!workout) return null;

  const update = (fn: (w: WorkoutDoc) => WorkoutDoc) => setWorkout(fn(workout));

  if (workout.endedAt !== null) {
    return (
      <Finished
        workout={workout}
        onDelete={() => {
          if (workout.id === undefined) return;
          if (!window.confirm("Delete this workout? This can't be undone.")) return;
          void deleteWorkout(workout.id).then(() => navigate("/", { replace: true }));
        }}
      />
    );
  }

  const elapsed = now - workout.startedAt;

  const addExercise = (name: string) => {
    if (workout.exercises.some((exercise) => exercise.name === name)) return;
    update((w) => ({
      ...w,
      exercises: [...w.exercises, { name, sets: [{ kg: null, reps: null }] }],
    }));
    // Reveal the full exercise card after React commits the append.
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-exercise-name="${CSS.escape(name)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // An in-progress workout with nothing logged has nothing to
            // resume — discard it instead of leaving a phantom draft behind.
            const empty = workout.endedAt === null && workout.exercises.length === 0;
            if (empty && workout.id !== undefined) void deleteWorkout(workout.id);
            navigate("/");
          }}
          aria-label="Back"
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Elapsed</p>
          <p className="text-3xl font-semibold leading-tight">{formatElapsed(elapsed)}</p>
        </div>
      </header>

      <Reorder.Group
        axis="y"
        values={workout.exercises}
        onReorder={(exercises: WorkoutExercise[]) => update((w) => ({ ...w, exercises }))}
        className="m-0 list-none space-y-3 p-0"
      >
        {workout.exercises.map((exercise, i) => {
          const prev = lastSession(history, exercise.name);
          return (
            <ExerciseItem
              key={exercise.name}
              exercise={exercise}
              previousSession={prev}
              lastBest={prev ? bestSet(sessionSets(prev, exercise.name)) : null}
              bestEver={bestSet(exerciseSets(history, exercise.name))}
              onAddSet={() =>
                update((w) => ({
                  ...w,
                  exercises: w.exercises.map((ex, j) =>
                    j === i ? { ...ex, sets: [...ex.sets, { kg: null, reps: null }] } : ex,
                  ),
                }))
              }
              onRemoveExercise={() =>
                update((w) => ({ ...w, exercises: w.exercises.filter((_, j) => j !== i) }))
              }
              onSetChange={(setIndex, set) =>
                update((w) => ({
                  ...w,
                  exercises: w.exercises.map((ex, j) =>
                    j === i
                      ? { ...ex, sets: ex.sets.map((s, k) => (k === setIndex ? set : s)) }
                      : ex,
                  ),
                }))
              }
              onSetRemove={(setIndex) =>
                update((w) => ({
                  ...w,
                  exercises: w.exercises.map((ex, j) =>
                    j === i ? { ...ex, sets: ex.sets.filter((_, k) => k !== setIndex) } : ex,
                  ),
                }))
              }
              onDetails={() => setDetailName(exercise.name)}
            />
          );
        })}
      </Reorder.Group>

      {workout.exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No exercises yet — add one to start logging.
        </p>
      )}

      <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
        <Plus /> Add exercise
      </Button>

      <div className="sticky bottom-4 pt-2">
        <Button
          size="lg"
          className="w-full shadow-lg"
          onClick={() => update((w) => finishWorkout(w, (name) => lastSession(history, name)))}
        >
          Finish Workout
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(name) => {
          setPickerOpen(false);
          setDetailName(null);
          addExercise(name);
        }}
        onDetails={(name) => setDetailName(name)}
        history={history}
        existing={workout.exercises.map((e) => e.name)}
      />

      <ExerciseDetailSheet
        open={detailName !== null}
        name={detailName ?? ""}
        onOpenChange={(open) => {
          if (!open) setDetailName(null);
        }}
        onAdd={
          detailName !== null
            ? () => {
                addExercise(detailName);
                setPickerOpen(false);
                setDetailName(null);
              }
            : undefined
        }
      />
    </div>
  );
}
