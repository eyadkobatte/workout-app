import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sheet, SheetTitle } from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { categoryList, loadExercises, type ExerciseInfo } from "../lib/exercises";
import { groupLabel, type Category } from "../lib/muscleGroups";

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (name: string) => void;
  /** Names already in the workout — hidden from the picker. */
  existing?: string[];
}

/** Row for a single exercise; shared by the drill-in and search views. */
function ExerciseRow({
  exercise,
  onPick,
}: Pick<ExercisePickerProps, "onPick"> & { exercise: ExerciseInfo }) {
  return (
    <li>
      <button
        type="button"
        className="flex h-11 w-full items-baseline justify-between px-4 text-left text-sm hover:bg-muted"
        onClick={() => onPick(exercise.name)}
      >
        <span>{exercise.name}</span>
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
          {exercise.equipment || exercise.muscle}
        </span>
      </button>
    </li>
  );
}

/**
 * Bottom sheet for picking an exercise into the active workout. Opens on
 * muscle-group categories; drilling in lists that group's exercises; search
 * is pinned above both and takes over the moment a query is typed.
 */
export function ExercisePicker({ open, onOpenChange, onPick, existing = [] }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);

  useEffect(() => {
    if (open) void loadExercises().then(setExercises);
  }, [open]);

  // Reset the view from the close event, not an effect.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setQuery("");
      setCategory(null);
    }
  };

  const available = useMemo(() => {
    const added = new Set(existing);
    return exercises.filter((e) => !added.has(e.name));
  }, [exercises, existing]);

  const categories = useMemo(() => categoryList(available), [available]);

  const searching = query.trim() !== "";

  const results = useMemo(() => {
    const q = query.toLowerCase();
    const pool = searching ? available : available.filter((e) => e.category === category);
    return pool.filter((e) => !searching || e.name.toLowerCase().includes(q)).slice(0, 50);
  }, [available, category, query, searching]);

  const body = searching ? (
    <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
      {results.map((e) => (
        <ExerciseRow key={e.id} exercise={e} onPick={onPick} />
      ))}
      {results.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
      )}
    </ul>
  ) : category ? (
    <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
      {results.map((e) => (
        <ExerciseRow key={e.id} exercise={e} onPick={onPick} />
      ))}
      {results.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-muted-foreground">
          No exercises in this group
        </li>
      )}
    </ul>
  ) : (
    <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
      {categories.map((c) => (
        <li key={c.category}>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between px-4 text-left hover:bg-muted"
            onClick={() => setCategory(c.category)}
          >
            <span className="text-sm font-medium">{c.label}</span>
            <span className="text-xs text-muted-foreground">
              {c.count} exercise{c.count === 1 ? "" : "s"}
            </span>
          </button>
        </li>
      ))}
      {categories.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-muted-foreground">
          No exercises available
        </li>
      )}
    </ul>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2">
          {category && !searching && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to categories"
              onClick={() => setCategory(null)}
            >
              ←
            </Button>
          )}
          <SheetTitle>
            {searching ? "Search results" : (category ? groupLabel(category) : "Add exercise")}
          </SheetTitle>
        </div>
        <Input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-3"
        />
      </div>
      <div className="mt-2">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={searching ? "search" : (category ?? "categories")}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
