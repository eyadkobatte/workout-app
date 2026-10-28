import { ChevronRight, Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { WorkoutCard } from "../components/WorkoutCard";
import { downloadCsv } from "../lib/csv";
import { getWorkouts, type Workout } from "../lib/db";
import { navigate } from "../lib/router";
import { formatElapsed } from "../lib/stats";
import { useNow } from "../lib/useNow";
import { activeDraft, finishedWorkouts } from "../lib/workoutSession";

export function Home() {
  const [all, setAll] = useState<Workout[]>([]);
  const now = useNow(1000);

  useEffect(() => {
    void getWorkouts().then(setAll);
  }, []);

  const draft = activeDraft(all); // at most one (ADR 0001)
  const finished = finishedWorkouts(all).reverse(); // newest first

  return (
    <div className="space-y-6">
      {draft?.id !== undefined && (
        <button
          type="button"
          onClick={() => navigate(`/workout/${draft.id}`)}
          className="flex w-full items-center gap-3 rounded-lg border border-accent/20 bg-accent/10 p-4 text-left transition-colors hover:bg-accent/15"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Resume workout</span>
            <span className="block text-xs text-muted-foreground">
              {formatElapsed(now - draft.startedAt)} elapsed
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      <div className="grid gap-2">
        <Button size="lg" onClick={() => navigate("/workout/new")}>
          <Plus /> Start Workout
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/exercises")}>
            <Plus /> New Exercise
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => void getWorkouts().then(downloadCsv)}
          >
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {finished.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No workouts yet. Start your first one!
          </p>
        ) : (
          finished.map((w, i) => <WorkoutCard key={w.id} workout={w} index={i} />)
        )}
      </div>
    </div>
  );
}
