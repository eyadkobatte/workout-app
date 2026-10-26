import { GripVertical, Plus, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Workout, WorkoutExercise, WorkoutSet } from "../lib/db";
import { cn } from "../lib/utils";
import { SET_GRID, SetRow } from "./SetRow";

export interface ExerciseCardProps {
  exercise: WorkoutExercise;
  /** The exercise's most recent finished session — prev column + placeholders. */
  previousSession: Workout | null;
  /** Best set of that session, for the LAST chip. */
  lastBest: WorkoutSet | null;
  /** All-time best set by e1RM, for the BEST chip. */
  bestEver: WorkoutSet | null;
  onAddSet: () => void;
  onRemoveExercise: () => void;
  onSetChange: (index: number, set: WorkoutSet) => void;
  onSetRemove: (index: number) => void;
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", accent && "text-accent")}>{value}</span>
    </span>
  );
}

/**
 * One exercise rendered as a page from the paper log (issue 01): hairline
 * ruled set rows, ghosted prev column, inputs sitting on the rules.
 */
export function ExerciseCard({
  exercise,
  previousSession,
  lastBest,
  bestEver,
  onAddSet,
  onRemoveExercise,
  onSetChange,
  onSetRemove,
  onDragStart,
}: ExerciseCardProps) {
  const prevSets = previousSession?.exercises.find((e) => e.name === exercise.name)?.sets;
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1 px-1 pt-1">
        <button
          type="button"
          aria-label={`Reorder ${exercise.name}`}
          onPointerDown={onDragStart}
          className="flex h-11 w-8 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="size-4" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{exercise.name}</h2>
        <button
          type="button"
          aria-label={`Remove ${exercise.name}`}
          onClick={onRemoveExercise}
          className="flex h-11 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {(lastBest || bestEver) && (
        <div className="flex flex-wrap gap-2 px-2 pb-2 pl-11">
          {lastBest && <Chip label="Last" value={`${lastBest.kg ?? 0}×${lastBest.reps ?? 0}`} />}
          {bestEver && (
            <Chip label="Best" value={`${bestEver.kg ?? 0}×${bestEver.reps ?? 0}`} accent />
          )}
        </div>
      )}

      <div className="px-2 pb-2">
        <div
          className={cn(
            SET_GRID,
            "pb-1 text-[10px] uppercase tracking-wider text-muted-foreground",
          )}
        >
          <span>#</span>
          <span>Prev</span>
          <span>Kg</span>
          <span>Reps</span>
          <span />
        </div>
        <AnimatePresence initial={false}>
          {exercise.sets.map((set, i) => (
            <SetRow
              key={i}
              index={i}
              set={set}
              previous={prevSets?.[i]}
              onChange={(next) => onSetChange(i, next)}
              onRemove={() => onSetRemove(i)}
            />
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={onAddSet}
          className="flex h-11 w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" /> Add set
        </button>
      </div>
    </div>
  );
}
