import { describe, expect, it } from "vitest";
import { integerReps } from "../src/lib/stats";
import { blur, displayText, keystroke } from "../src/lib/numberField";

describe("displayText (init + external resync)", () => {
  it("renders null as empty and numbers as their strings", () => {
    expect(displayText(null)).toBe("");
    expect(displayText(0)).toBe("0"); // deliberate bodyweight zero, not "not entered"
    expect(displayText(62.5)).toBe("62.5");
  });
});

describe("keystroke (free numeric entry, issue 04 rule 1)", () => {
  it("commits every parseable keystroke so autosave keeps up", () => {
    expect(keystroke("62.5", (v) => v)).toEqual({ text: "62.5", commit: 62.5 });
    expect(keystroke(" 8 ", integerReps)).toEqual({ text: " 8 ", commit: 8 });
  });

  it("commits null for empty text — 'not entered', not zero", () => {
    expect(keystroke("", (v) => v)).toEqual({ text: "", commit: null });
    expect(keystroke("   ", (v) => v)).toEqual({ text: "   ", commit: null });
  });

  it("drafts unparseable text without committing", () => {
    expect(keystroke("abc", (v) => v)).toEqual({ text: "abc" });
    expect(keystroke("-", (v) => v)).toEqual({ text: "-" });
    expect(keystroke("6-2", (v) => v)).toEqual({ text: "6-2" });
  });

  it("commits '62.' as 62 while the text stays unreformatted", () => {
    // Number("62.") parses — the display drafts verbatim, the value keeps up.
    expect(keystroke("62.", (v) => v)).toEqual({ text: "62.", commit: 62 });
  });

  it("applies the field's parse before committing", () => {
    expect(keystroke("7.9", integerReps)).toEqual({ text: "7.9", commit: 7 });
  });
});

describe("blur (reformat + commit-if-changed)", () => {
  it("reformats a parseable draft and commits only when it differs", () => {
    expect(blur("62.5", 60, (v) => v)).toEqual({ text: "62.5", commit: 62.5 });
    expect(blur("62.", 62, (v) => v)).toEqual({ text: "62" }); // parses to 62, unchanged
    expect(blur("7.9", null, integerReps)).toEqual({ text: "7", commit: 7 });
  });

  it("resyncs the display from the value on empty or unparseable text — never commits", () => {
    // The null commit happens at keystroke time; blur only resyncs.
    expect(blur("", 60, (v) => v)).toEqual({ text: "60" });
    expect(blur("abc", 60, (v) => v)).toEqual({ text: "60" });
    expect(blur("", null, (v) => v)).toEqual({ text: "" });
  });
});
