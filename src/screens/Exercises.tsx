import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetTitle } from "../components/ui/sheet";
import { loadExercises, type ExerciseInfo } from "../lib/exercises";
import { putCustomExercise } from "../lib/db";
import { navigate } from "../lib/router";
import { cn } from "../lib/utils";

const MATCH_LIMIT = 100;

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-md border px-3.5 text-xs capitalize transition-colors",
        selected
          ? "border-accent/25 bg-accent/10 text-accent"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

interface AddCustomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All known names — duplicates are rejected. */
  existingNames: string[];
  initialName?: string;
  onSaved: () => void;
}

function AddCustomSheet({
  open,
  onOpenChange,
  existingNames,
  initialName = "",
  onSaved,
}: AddCustomSheetProps) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState("");

  // Reset the form from the close event, not an effect.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setName("");
      setMuscle("");
    }
  };

  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const canSave = trimmed !== "" && !duplicate;

  const save = () => {
    void putCustomExercise({ name: trimmed, muscle: muscle.trim() }).then(() => {
      onSaved();
      handleOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <div className="px-4 pt-2">
        <SheetTitle>Add custom exercise</SheetTitle>
        <div className="mt-3 space-y-2">
          <Input
            autoFocus
            placeholder="Name"
            aria-label="Exercise name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Muscle (e.g. chest) — optional"
            aria-label="Muscle"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
          />
          {duplicate && (
            <p className="text-xs text-muted-foreground">
              Already in the library — pick it from the list or rename this one.
            </p>
          )}
        </div>
        <Button className="mt-4 w-full" disabled={!canSave} onClick={save}>
          Save exercise
        </Button>
      </div>
    </Sheet>
  );
}

export function Exercises() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null); // null = all
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [seedName, setSeedName] = useState("");

  const refresh = useCallback(() => {
    void loadExercises().then(setExercises);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const muscles = useMemo(
    () => [...new Set(exercises.map((e) => e.muscle).filter((m) => m !== ""))].sort(),
    [exercises],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return exercises
      .filter((e) => (muscle === null || e.muscle === muscle) && e.name.toLowerCase().includes(q))
      .slice(0, MATCH_LIMIT);
  }, [exercises, query, muscle]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Exercises</h1>
        <Button
          variant="outline"
          onClick={() => {
            setSeedName("");
            setAddOpen(true);
          }}
        >
          Add custom
        </Button>
      </div>

      <Input
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="All" selected={muscle === null} onClick={() => setMuscle(null)} />
        {muscles.map((m) => (
          <FilterChip key={m} label={m} selected={muscle === m} onClick={() => setMuscle(m)} />
        ))}
      </div>

      <ul className="divide-y divide-border">
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex h-11 w-full items-baseline justify-between py-2 text-left hover:bg-muted"
              onClick={() => navigate(`/exercise/${encodeURIComponent(e.name)}`)}
            >
              <span className="text-sm">{e.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {e.muscle || (e.custom ? "custom" : "—")}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No matches
            {query.trim() !== "" && (
              <>
                {" — "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setSeedName(query.trim());
                    setAddOpen(true);
                  }}
                >
                  add “{query.trim()}” as a custom exercise
                </button>
              </>
            )}
          </li>
        )}
        {filtered.length === MATCH_LIMIT && (
          <li className="py-3 text-center text-xs text-muted-foreground">
            Showing the first {MATCH_LIMIT} — refine the search or pick a muscle
          </li>
        )}
      </ul>

      <AddCustomSheet
        key={seedName}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingNames={exercises.map((e) => e.name)}
        initialName={seedName}
        onSaved={refresh}
      />
    </div>
  );
}
