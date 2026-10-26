import { Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { WorkoutSet } from "../lib/db";
import { integerReps } from "../lib/stats";
import { cn } from "../lib/utils";

/** Column grid shared by the set rows and the ruled table header. */
export const SET_GRID = "grid grid-cols-[1.25rem_4rem_1fr_1fr_2rem] items-center gap-1";

interface SetRowProps {
  index: number;
  set: WorkoutSet;
  /** Last session's same-numbered set — the ghost column and placeholder. */
  previous?: WorkoutSet;
  onChange: (set: WorkoutSet) => void;
  onRemove: () => void;
}

interface NumberFieldProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  parse?: (value: number) => number;
  inputMode: "decimal" | "numeric";
  placeholder: string;
  label: string;
}

/**
 * Free numeric entry (issue 04 rule 1): a plain text field over a decimal
 * keypad. The visible text drafts while typing — "62." must not reformat to
 * "62" — and every parseable keystroke commits so autosave keeps up. When the
 * committed value changes from outside (reorder, row delete), the text
 * resyncs as long as the field is not focused.
 */
function NumberField({
  value,
  onCommit,
  parse = (v) => v,
  inputMode,
  placeholder,
  label,
}: NumberFieldProps) {
  const [text, setText] = useState(() => (value === null ? "" : String(value)));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value === null ? "" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    setText(raw);
    const trimmed = raw.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) onCommit(parse(parsed));
  };

  const blur = () => {
    focused.current = false;
    const parsed = Number(text.trim());
    if (text.trim() !== "" && !Number.isNaN(parsed)) {
      const final = parse(parsed);
      if (final !== value) onCommit(final);
      setText(String(final));
    } else {
      setText(value === null ? "" : String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onFocus={() => (focused.current = true)}
      onBlur={blur}
      onChange={(e) => commit(e.target.value)}
      className="h-11 w-full rounded-none bg-transparent px-1 text-right text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:bg-muted"
    />
  );
}

export function SetRow({ index, set, previous, onChange, onRemove }: SetRowProps) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={cn(SET_GRID, "border-b border-border")}>
        <span className="text-xs text-muted-foreground">{index + 1}</span>
        <span className="text-xs text-muted-foreground">
          {previous ? `${previous.kg ?? 0}×${previous.reps ?? 0}` : "—"}
        </span>
        <NumberField
          value={set.kg}
          onCommit={(kg) => onChange({ ...set, kg })}
          inputMode="decimal"
          placeholder={String(previous?.kg ?? 0)}
          label={`Set ${index + 1} weight in kg`}
        />
        <NumberField
          value={set.reps}
          onCommit={(reps) => onChange({ ...set, reps })}
          parse={integerReps}
          inputMode="numeric"
          placeholder={String(previous?.reps ?? 0)}
          label={`Set ${index + 1} reps`}
        />
        <button
          type="button"
          aria-label={`Delete set ${index + 1}`}
          onClick={onRemove}
          className="flex h-11 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
