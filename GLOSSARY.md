# Workout App

A client-only workout tracker PWA: "an Excel sheet with better UX". This is the
shared vocabulary for its domain.

## Language

**Logged set**:
A set whose effective reps are greater than zero. Only logged sets persist at
Finish and count toward stats.
_Avoid_: completed set, saved set

**Bodyweight set**:
A set with kg 0 — a deliberate zero, distinct from kg `null`, which means "not
entered".
_Avoid_: null-weight set, unloaded set

**Placeholder**:
The previous session's same-numbered set value shown inside an empty input. If
the field is still untouched at Finish, the placeholder becomes its value.
_Avoid_: pre-fill, default value

**Effective value**:
What a set field is worth at Finish: the typed value, else the placeholder,
else 0.
