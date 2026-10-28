import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sheet, SheetTitle } from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { categoryList, loadExercises, type ExerciseInfo } from "../lib/exercises";
import { groupLabel, type Category } from "../lib/muscleGroups";
import {
  categorySections,
  previouslyLogged,
  type ExerciseSection,
  type ExerciseUsage,
  type ExerciseUsageByName,
} from "../lib/exerciseUsage";
import {
  createExerciseSearch,
  searchExercises,
  SEARCH_RESULT_LIMIT,
  type ExerciseSearchResult,
} from "../lib/exerciseSearch";

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (name: string) => void;
  onDetails: (name: string) => void;
  /** Personal usage per exercise name — previously logged ranking. */
  usage: ExerciseUsageByName;
  /** Names already in the workout — hidden from the picker. */
  existing?: string[];
}

interface PickerRow {
  exercise: ExerciseInfo;
  usage: ExerciseUsage | null;
}

/** Row for a single exercise; shared by the drill-in and search views. */
function ExerciseRow({
  exercise,
  usage,
  onPick,
  onDetails,
}: PickerRow & Pick<ExercisePickerProps, "onPick" | "onDetails">) {
  return (
    <li className="flex items-stretch">
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-1 py-1.5 pl-4 pr-1 text-left text-sm hover:bg-muted"
        onClick={() => onPick(exercise.name)}
      >
        <span className="min-w-0">
          <span className="block truncate">{exercise.name}</span>
          {usage && (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Done before · {usage.sessionCount} session{usage.sessionCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
          {exercise.equipment || exercise.muscle}
        </span>
      </button>
      <button
        type="button"
        aria-label={`View ${exercise.name} details`}
        onClick={() => onDetails(exercise.name)}
        className="flex h-11 w-11 shrink-0 items-center justify-center px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Info className="size-4" />
      </button>
    </li>
  );
}

function Rows({
  rows,
  onPick,
  onDetails,
}: {
  rows: PickerRow[];
} & Pick<ExercisePickerProps, "onPick" | "onDetails">) {
  return (
    <>
      {rows.map(({ exercise, usage }) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          usage={usage}
          onPick={onPick}
          onDetails={onDetails}
        />
      ))}
    </>
  );
}

const rowFromUsage = (
  usageMap: ReadonlyMap<string, ExerciseUsage>,
  exercise: ExerciseInfo,
): PickerRow => ({
  exercise,
  usage: previouslyLogged(usageMap, exercise.name),
});

const rowFromSearchResult = (
  result: ExerciseSearchResult,
  usageMap: ReadonlyMap<string, ExerciseUsage>,
): PickerRow => rowFromUsage(usageMap, result.exercise);

function EmptyState({ text }: { text: string }) {
  return <li className="px-4 py-6 text-center text-sm text-muted-foreground">{text}</li>;
}

/**
 * Bottom sheet for picking an exercise into the active workout. Opens on
 * muscle-group categories; drilling in lists that group's exercises first
 * by previously logged usage; search is weighted exhaustively across the
 * entire available catalog.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  onDetails,
  usage,
  existing = [],
}: ExercisePickerProps) {
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
  const source = useMemo(() => createExerciseSearch(available), [available]);

  const searching = query.trim() !== "";

  const searchRows = useMemo(() => {
    if (!searching) return [];
    return searchExercises(source, query, usage).map((result) =>
      rowFromSearchResult(result, usage),
    );
  }, [searching, source, query, usage]);

  const sections = useMemo<ExerciseSection[]>(() => {
    if (searching || category === null) return [];
    const pool = available.filter((e) => e.category === category);
    return categorySections(pool, usage, SEARCH_RESULT_LIMIT);
  }, [available, category, searching, usage]);

  const renderRows = (rows: PickerRow[]) => (
    <Rows rows={rows} onPick={onPick} onDetails={onDetails} />
  );

  const body = searching ? (
    <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
      {renderRows(searchRows)}
      {searchRows.length === 0 && <EmptyState text="No matches" />}
    </ul>
  ) : category ? (
    <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
      {sections.map((section) => (
        <li key={section.heading ?? "exercises"}>
          {section.heading && (
            <h3 className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.heading}
            </h3>
          )}
          <ul className="divide-y divide-border">
            <Rows
              rows={section.exercises.map((exercise) => rowFromUsage(usage, exercise))}
              onPick={onPick}
              onDetails={onDetails}
            />
          </ul>
        </li>
      ))}
      {sections.length === 0 && <EmptyState text="No exercises in this group" />}
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
      {categories.length === 0 && <EmptyState text="No exercises available" />}
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
            {searching ? "Search results" : category ? groupLabel(category) : "Add exercise"}
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
