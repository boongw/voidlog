interface TrendPoint {
  id: string;
  successRate: number | null;
  avgGroupDps: number;
}

const WIDTH = 760;
const HEIGHT = 140;
const TOP = 10;
const BOTTOM = 130;

function buildPoints(values: number[], min: number, max: number): string {
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = values.length === 1 ? WIDTH / 2 : (i / (values.length - 1)) * WIDTH;
      const y = BOTTOM - ((v - min) / span) * (BOTTOM - TOP);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const successValues = points.map((p) => p.successRate ?? 0);
  const dpsValues = points.map((p) => p.avgGroupDps);
  const dpsMin = Math.min(...dpsValues);
  const dpsMax = Math.max(...dpsValues);

  return (
    <>
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <line x1="0" y1="35" x2={WIDTH} y2="35" stroke="var(--line-soft)" strokeWidth="1" />
        <line x1="0" y1="70" x2={WIDTH} y2="70" stroke="var(--line-soft)" strokeWidth="1" />
        <line x1="0" y1="105" x2={WIDTH} y2="105" stroke="var(--line-soft)" strokeWidth="1" />
        <polyline
          points={buildPoints(successValues, 0, 100)}
          fill="none"
          stroke="var(--warning)"
          strokeWidth="2.5"
        />
        <polyline
          points={buildPoints(dpsValues, dpsMin, dpsMax)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
        />
      </svg>
      <div className="mt-2.5 flex gap-5">
        <div className="text-muted-strong flex items-center gap-1.5 text-xs">
          <span className="bg-warning inline-block h-[2.5px] w-2.5" />
          Erfolgsquote
        </div>
        <div className="text-muted-strong flex items-center gap-1.5 text-xs">
          <span className="bg-primary inline-block h-0.5 w-2.5" />Ø Gruppen-DPS
        </div>
      </div>
    </>
  );
}
