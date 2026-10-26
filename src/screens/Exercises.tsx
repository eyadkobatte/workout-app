import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { loadExercises, type ExerciseInfo } from "../lib/exercises";
import { navigate } from "../lib/router";

// TODO: muscle filter chips, add-custom-exercise dialog.
export function Exercises() {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);

  useEffect(() => {
    void loadExercises().then(setExercises);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 100);
  }, [exercises, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Exercises</h1>
        <Button variant="outline" size="sm">
          Add custom
        </Button>
      </div>
      <Input
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="divide-y divide-border">
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              className="flex w-full items-baseline justify-between py-2 text-left"
              onClick={() => navigate(`/exercise/${encodeURIComponent(e.name)}`)}
            >
              <span className="text-sm">{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.muscle}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
