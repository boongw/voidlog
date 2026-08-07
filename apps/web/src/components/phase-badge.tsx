// Deterministic per-phase color, cycling through a fixed palette by phase
// order — mirrors the design's "one color per boss phase" look without
// hardcoding boss-specific phase names.
const PHASE_COLORS = ["#5FC9E8", "#E85D2D", "#A98FDB", "#4CA64C", "#8A6BA0", "#3DBFA6"];

export function phaseColor(order: number): string {
  const index = ((order % PHASE_COLORS.length) + PHASE_COLORS.length) % PHASE_COLORS.length;
  return PHASE_COLORS[index] ?? PHASE_COLORS[0]!;
}

export function PhaseBadge({ name, order }: { name: string; order: number }) {
  const color = phaseColor(order);
  return (
    <span
      className="inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: `${color}20`, color, borderColor: color }}
    >
      {name}
    </span>
  );
}
