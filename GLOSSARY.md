# Workout App

A client-only workout tracker PWA: "an Excel sheet with better UX". This is the
shared vocabulary for its domain.

## Language

**Workout**:
One training record, from creation to deletion. Stats draw only from
finished workouts.
_Avoid_: session (as a synonym for the workout itself)

**Draft**:
A workout in progress. At most one draft exists at a time; starting a
workout resumes the existing draft rather than creating another. A draft
dies at Finish, at leaving with nothing logged, or at deletion — it
survives a killed app. Drafts do not contribute to stats.
_Avoid_: active workout, open workout, unfinished workout

**Session**:
A finished workout that includes a given exercise. "The previous
session" is the most recent such workout.
_Avoid_: workout (as a synonym for a single training record)

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

**Previously logged exercise**:
An exercise with at least one logged set in a finished workout. Exact exercise
names distinguish variations. Draft workouts do not contribute.
_Avoid_: favorite exercise, pinned exercise, recently used exercise
