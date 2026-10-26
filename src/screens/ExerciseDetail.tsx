import { LineChart } from "../components/LineChart";
import { Card, CardContent } from "../components/ui/card";

// TODO: animated 2-frame exercise image, summary stats, session history.
const CHARTS = ["Volume", "Total reps", "Total sets", "Est. 1RM"] as const;

export function ExerciseDetail({ name }: { name: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{name}</h1>
      <div className="grid grid-cols-2 gap-3">
        {CHARTS.map((title) => (
          <Card key={title}>
            <CardContent className="pt-4">
              <LineChart title={title} values={[]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
