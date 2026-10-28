# One draft, ordered by id

The workout tracker keeps at most one draft (in-progress workout) at a
time: starting a workout resumes the existing draft instead of creating
another, so no draft can become unreachable behind a newer one. Workouts
are treated as chronological by primary-key order — `getWorkouts()`
returns ascending `id`, which equals creation order because inserts are
always keyless puts and IndexedDB's key generator never reuses or
reorders committed keys — so no code sorts by `startedAt`.

## Consequences

- The ordering invariant is a property of write discipline, not the
  store: it holds only while every insert is a keyless `put`. A future
  import/restore path that assigns explicit ids in non-chronological
  order breaks it and must re-establish ordering explicitly.
- A draft dies at Finish, at leaving with nothing logged ("nothing
  logged" = no logged set anywhere in the draft, not merely no
  exercises), or at deletion; it survives a killed app (autosave).
- Ids have gaps (deletes never renumber): they order, they must never
  be used for arithmetic.

Grounded in research on the IndexedDB specification — see
`.scratch/refinements-01/issues/06-id-order-chronological.md`.
