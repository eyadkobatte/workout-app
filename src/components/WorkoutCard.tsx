import { motion } from "motion/react";
import type { Workout } from "../lib/db";
import { navigate } from "../lib/router";
import {
  displayVolume,
  durationMs,
  workoutRepCount,
  workoutSetCount,
  workoutVolume,
} from "../lib/stats";
import { Card } from "./ui/card";

export function WorkoutCard({ workout, index }: { workout: Workout; index: number }) {
  const date = new Date(workout.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const duration = durationMs(workout);
  const minutes = duration !== null ? Math.round(duration / 60000) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => navigate(`/workout/${workout.id}`)}
      >
        <div className="flex items-baseline justify-between p-4 pb-2">
          <h2 className="text-sm font-semibold">{date}</h2>
          <p className="text-lg font-semibold">
            {displayVolume(workoutVolume(workout))}
            <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
          </p>
        </div>
        <div className="px-4 pb-3">
          <p className="truncate text-xs text-muted-foreground">
            {workout.exercises.map((e) => e.name).join(", ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {minutes} min · {workoutSetCount(workout)} sets · {workoutRepCount(workout)} reps
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
