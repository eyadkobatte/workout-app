import { motion } from "motion/react";

interface LineChartProps {
  title: string;
  values: number[];
  height?: number;
}

/** Hand-rolled animated SVG line chart (no chart library). */
export function LineChart({ title, values, height = 120 }: LineChartProps) {
  const width = 320;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${i * stepX},${height - 8 - (v / max) * (height - 16)}`)
    .join(" ");

  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {values.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <motion.polyline
            points={points}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
        </svg>
      )}
    </div>
  );
}
