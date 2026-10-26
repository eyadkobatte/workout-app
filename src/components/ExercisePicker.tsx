import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { loadExercises, type ExerciseInfo } from "../lib/exercises";
import { Dialog, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (name: string) => void;
  /** Names already in the workout — hidden from the picker. */
  existing?: string[];
}

/** Bottom sheet sliding up over a dimmed backdrop (PLAN animations). */
export function ExercisePicker({ open, onOpenChange, onPick, existing = [] }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);

  useEffect(() => {
    if (open) void loadExercises().then(setExercises);
  }, [open]);

  // Reset the search from the close event, not an effect.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) setQuery("");
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const added = new Set(existing);
    return exercises
      .filter((e) => !added.has(e.name) && e.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [exercises, query, existing]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content forceMount asChild aria-describedby={undefined}>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-lg border border-b-0 border-border bg-card pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
              >
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
                <div className="px-4 pt-2">
                  <DialogTitle>Add exercise</DialogTitle>
                  <Input
                    autoFocus
                    placeholder="Search exercises…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="mt-3"
                  />
                </div>
                <ul className="mt-2 max-h-[50dvh] divide-y divide-border overflow-y-auto">
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="flex h-11 w-full items-baseline justify-between px-4 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          onPick(e.name);
                          handleOpenChange(false);
                        }}
                      >
                        <span>{e.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{e.muscle}</span>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No matches
                    </li>
                  )}
                </ul>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
