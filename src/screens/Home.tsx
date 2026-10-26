import { Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { WorkoutCard } from "../components/WorkoutCard";
import { downloadCsv } from "../lib/csv";
import { getWorkouts, type Workout } from "../lib/db";
import { navigate } from "../lib/router";

export function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    void getWorkouts().then((all) => setWorkouts(all.filter((w) => w.endedAt !== null).reverse()));
  }, []);

  const draft = undefined; // TODO: resume banner for in-progress workout

  return (
    <div className="space-y-6">
      {draft && <div className="rounded-lg bg-accent/10 p-4">Resume workout</div>}

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
        {workouts.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No workouts yet. Start your first one!
          </p>
        ) : (
          workouts.map((w, i) => <WorkoutCard key={w.id} workout={w} index={i} />)
        )}
      </div>
    </div>
  );
}
