import { motion } from "motion/react";
import type { WorkoutSet } from "../lib/db";
import { Input } from "./ui/input";

interface SetRowProps {
  index: number;
  set: WorkoutSet;
  /** Last session's same-numbered set, shown greyed-out / as placeholder. */
  previous?: WorkoutSet;
  onChange: (set: WorkoutSet) => void;
  onRemove: () => void;
}

export function SetRow({ index, set, previous, onChange }: SetRowProps) {
  const parse = (value: string) => (value === "" ? null : Number(value));
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2 py-1">
        <span className="text-sm text-muted-foreground">{index + 1}</span>
        <span className="text-sm text-muted-foreground">
          {previous ? `${previous.kg ?? "-"}×${previous.reps ?? "-"}` : "—"}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          placeholder={previous?.kg != null ? String(previous.kg) : "kg"}
          value={set.kg ?? ""}
          onChange={(e) => onChange({ ...set, kg: parse(e.target.value) })}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder={previous?.reps != null ? String(previous.reps) : "reps"}
          value={set.reps ?? ""}
          onChange={(e) => onChange({ ...set, reps: parse(e.target.value) })}
        />
      </div>
    </motion.div>
  );
}
