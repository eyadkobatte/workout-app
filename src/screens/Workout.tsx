import { Button } from "../components/ui/button";
import { navigate } from "../lib/router";

// TODO: active workout — elapsed timer, exercise cards with set tables (SetRow),
// LAST/BEST chips, add set / add exercise (ExercisePicker), finish workout.
// TODO: finished workout — read-only summary + delete.
export function Workout({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Workout {id}</h1>
      <p className="text-muted-foreground">TODO: workout logging screen</p>
      <Button variant="outline" onClick={() => navigate("/")}>
        Back home
      </Button>
    </div>
  );
}
