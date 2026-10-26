import { motion } from "motion/react";
import type { Workout } from "../lib/db";
import { navigate } from "../lib/router";
import { durationMs, workoutSetCount, workoutVolume } from "../lib/stats";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

function formatDuration(ms: number | null): string {
  if (ms === null) return "in progress";
  const min = Math.round(ms / 60000);
  return `${min} min`;
}

export function WorkoutCard({ workout, index }: { workout: Workout; index: number }) {
  const date = new Date(workout.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
        <CardHeader>
          <CardTitle>{date}</CardTitle>
          <CardDescription>
            {formatDuration(durationMs(workout))} · {workout.exercises.length} exercises ·{" "}
            {workoutSetCount(workout)} sets · {Math.round(workoutVolume(workout))} kg
          </CardDescription>
          <CardDescription>{workout.exercises.map((e) => e.name).join(", ")}</CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}
