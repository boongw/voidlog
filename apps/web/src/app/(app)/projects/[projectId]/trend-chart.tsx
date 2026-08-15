export interface TrendPoint {
  id: string;
  occurredAt: Date;
  avgGroupDps: number;
  greenFailRate: number | null;
  shockwaveHitRate: number | null;
}

const WIDTH = 760;
const HEIGHT = 160;
const TOP = 10;
const BOTTOM = 130;
// Reserved on the left for the y-axis value labels, so the plotted line
// never overlaps its own axis.
const AXIS_WIDTH = 46;
const PLOT_WIDTH = WIDTH - AXIS_WIDTH;

function formatAxisDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function xAt(index: number, count: number): number {
  return AXIS_WIDTH + (count === 1 ? PLOT_WIDTH / 2 : (index / (count - 1)) * PLOT_WIDTH);
}

function buildPoints(values: number[], min: number, max: number): string {
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = xAt(i, values.length);
      const y = BOTTOM - ((v - min) / span) * (BOTTOM - TOP);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function SingleLineChart({
  values,
  dates,
  color,
  formatValue,
}: {
  values: number[];
  dates: Date[];
  color: string;
  formatValue: (v: number) => string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = (min + max) / 2;
  const midY = (TOP + BOTTOM) / 2;

  return (
    <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      <line x1={AXIS_WIDTH} y1={TOP} x2={WIDTH} y2={TOP} stroke="var(--line-soft)" strokeWidth="1" />
      <line x1={AXIS_WIDTH} y1={midY} x2={WIDTH} y2={midY} stroke="var(--line-soft)" strokeWidth="1" />
      <line
        x1={AXIS_WIDTH}
        y1={BOTTOM}
        x2={WIDTH}
        y2={BOTTOM}
        stroke="var(--line-soft)"
        strokeWidth="1"
      />
      <text x={AXIS_WIDTH - 6} y={TOP + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
        {formatValue(max)}
      </text>
      <text x={AXIS_WIDTH - 6} y={midY + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
        {formatValue(mid)}
      </text>
      <text x={AXIS_WIDTH - 6} y={BOTTOM + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
        {formatValue(min)}
      </text>
      {dates.map((date, i) => (
        <text
          key={i}
          x={xAt(i, dates.length)}
          y={BOTTOM + 16}
          textAnchor="middle"
          fontSize="9"
          fill="var(--muted)"
        >
          {formatAxisDate(date)}
        </text>
      ))}
      <polyline points={buildPoints(values, min, max)} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function DpsTrendChart({ points }: { points: TrendPoint[] }) {
  const values = points.map((p) => p.avgGroupDps);
  const dates = points.map((p) => p.occurredAt);
  return (
    <SingleLineChart
      values={values}
      dates={dates}
      color="var(--primary)"
      formatValue={(v) => Math.round(v).toLocaleString("de-DE")}
    />
  );
}

export function GreenFailTrendChart({ points }: { points: TrendPoint[] }) {
  const values = points.map((p) => p.greenFailRate ?? 0);
  const dates = points.map((p) => p.occurredAt);
  return (
    <SingleLineChart
      values={values}
      dates={dates}
      color="var(--danger)"
      formatValue={(v) => `${Math.round(v)}%`}
    />
  );
}

export function ShockwaveTrendChart({ points }: { points: TrendPoint[] }) {
  const values = points.map((p) => p.shockwaveHitRate ?? 0);
  const dates = points.map((p) => p.occurredAt);
  return (
    <SingleLineChart
      values={values}
      dates={dates}
      color="var(--warning)"
      formatValue={(v) => `${Math.round(v)}%`}
    />
  );
}
