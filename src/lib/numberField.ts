/**
 * The text↔value policy behind a free numeric field (issue 05): what the
 * visible text drafts while typing, when a keystroke commits so autosave
 * keeps up, and how blur reformats. Owns the GLOSSARY bodyweight-vs-
 * not-entered invariant: empty text commits null ("not entered"), never 0 —
 * 0 is a deliberate bodyweight value. `NumberField` is the thin DOM
 * adapter over this module; the policy is testable with plain calls.
 */

/** What a policy step wants the field to show, and commit — if anything. */
export interface FieldUpdate {
  /** The text to display verbatim (drafts like "62." survive). */
  text: string;
  /**
   * Absent = nothing to commit (unparseable draft, or an unchanged blur).
   * Present null = commit "not entered". Present number = commit it.
   */
  commit?: number | null;
}

/** null renders as empty; a deliberate 0 renders as "0". */
export function displayText(value: number | null): string {
  return value === null ? "" : String(value);
}

/** One keystroke: the raw text always drafts; parseable text commits immediately. */
export function keystroke(raw: string, parse: (value: number) => number): FieldUpdate {
  const trimmed = raw.trim();
  if (trimmed === "") return { text: raw, commit: null };
  const parsed = Number(trimmed);
  if (!Number.isNaN(parsed)) return { text: raw, commit: parse(parsed) };
  return { text: raw };
}

/**
 * Blur: a parseable draft reformats to its final value and commits only
 * when it differs; empty or unparseable text resyncs from the value
 * without committing (the null commit belongs to the keystroke path).
 */
export function blur(
  text: string,
  value: number | null,
  parse: (value: number) => number,
): FieldUpdate {
  const trimmed = text.trim();
  const parsed = Number(trimmed);
  if (trimmed === "" || Number.isNaN(parsed)) return { text: displayText(value) };
  const final = parse(parsed);
  return final !== value ? { text: String(final), commit: final } : { text: String(final) };
}
