import { motion } from "motion/react";
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const VIEW_W = 320;
const PAD_TOP = 8;
const PAD_BOTTOM = 6;

interface LineChartProps {
  title: string;
  values: number[];
  /** Session labels aligned with values; readout date while scrubbing. */
  labels?: string[];
  height?: number;
  format?: (value: number) => string;
}

/**
 * Hand-rolled animated SVG line chart (no chart library), interaction locked
 * in issue 03: draw-in on mount; tap/drag scrubs, snapping to the nearest
 * session; the card header is the readout — latest value at rest, snapped
 * value + date while scrubbing, latest again on release. Sessions are equally
 * spaced; chrome is one hairline baseline, no gridlines or ticks.
 */
export function LineChart({
  title,
  values,
  labels,
  height = 120,
  format = (v) => String(Math.round(v)),
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...values, 1);
  const xAt = (i: number) =>
    values.length === 1 ? VIEW_W / 2 : (i * VIEW_W) / (values.length - 1);
  const yAt = (v: number) => height - PAD_BOTTOM - (v / max) * (height - PAD_TOP - PAD_BOTTOM);
  const points = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");

  const index = active ?? values.length - 1; // latest value at rest

  const indexAt = (clientX: number): number => {
    if (values.length < 2) return 0;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const x = ((clientX - rect.left) / rect.width) * VIEW_W;
    return Math.min(values.length - 1, Math.max(0, Math.round((x / VIEW_W) * (values.length - 1))));
  };

  const scrub = (event: ReactPointerEvent<SVGSVGElement>) => setActive(indexAt(event.clientX));

  if (values.length === 0) {
    return (
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* The header is the readout. */}
      <div className="flex items-baseline justify-between gap-2 pb-1">
        <p className="shrink-0 text-xs text-muted-foreground">{title}</p>
        <p className="min-w-0 truncate text-right text-base font-semibold">
          {format(values[index])}
          {active !== null && labels?.[index] !== undefined && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {labels[index]}
            </span>
          )}
        </p>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="w-full touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        }}
        onPointerMove={(event) => {
          if (active !== null) scrub(event);
        }}
        onPointerUp={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        {/* one hairline baseline at zero — the only chrome (issue 03) */}
        <line
          x1={0}
          x2={VIEW_W}
          y1={yAt(0)}
          y2={yAt(0)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
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
        {/* scrub guide: hairline rule + dot, only while touching */}
        {active !== null && (
          <line
            x1={xAt(index)}
            x2={xAt(index)}
            y1={PAD_TOP - 4}
            y2={yAt(0)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        )}
        <circle cx={xAt(index)} cy={yAt(values[index])} r={3.5} fill="var(--color-accent)" />
      </svg>
      {/* x-axis: first and last session dates as small end labels */}
      {labels !== undefined && labels.length > 1 && (
        <div className="flex justify-between pt-0.5 text-[10px] text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}
