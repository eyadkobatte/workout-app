import { useEffect, useMemo, useState } from "react";
import { loadExercises, type ExerciseInfo } from "../lib/exercises";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (name: string) => void;
}

// TODO: restyle as a bottom sheet sliding up (Motion) instead of a centered dialog.
export function ExercisePicker({ open, onOpenChange, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);

  useEffect(() => {
    if (open) void loadExercises().then(setExercises);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 50);
  }, [exercises, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add exercise</DialogTitle>
        <Input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-4"
        />
        <ul className="mt-2 max-h-80 overflow-y-auto">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick(e.name);
                  onOpenChange(false);
                }}
              >
                {e.name}
                <span className="ml-2 text-xs text-muted-foreground">{e.muscle}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
