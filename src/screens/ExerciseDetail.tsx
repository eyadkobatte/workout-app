import { ExerciseDetailView } from "../components/ExerciseDetailSheet";
import { navigate } from "../lib/router";

/**
 * Standalone route wrapper around the reusable exercise detail view. The
 * workout flow presents the same view in a full-screen sheet instead.
 */
export function ExerciseDetail({ name }: { name: string }) {
  return (
    <ExerciseDetailView
      name={name}
      onBack={() => navigate("/exercises")}
      onOpenWorkout={(workoutId) => navigate(`/workout/${workoutId}`)}
    />
  );
}
