/**
 * Raw EI mechanic names that aren't real "boss mechanic fails" and would
 * drown out the ones that matter if shown (auto-tracked achievement/res
 * events that fire constantly) — filtered out wherever failed-mechanic
 * markers are surfaced. "Dead" is handled separately since death events
 * feed a dedicated death-marker UI instead of being discarded outright.
 */
const NOISE_MECHANIC_NAMES = new Set([
  "Orb Push",
  "Res",
  "Got up",
  "Red.B",
  "Spread.B",
  "J.Breath.H",
  "J.Grasp.H",
  "VoidExp.H",
  "NopeRopes.Achiv.L",
  "NopeRopes.Achiv.K",
  "S.Green",
]);

/**
 * The handful of boss-cast markers (see cast-markers.ts on the worker)
 * that are individually curated and shown as distinct timeline ticks —
 * everything else matching `<Group>.Cast.<skillId>` is bulk-captured for
 * later analysis but has no UI treatment yet, so it's noise for now.
 */
const VISIBLE_CAST_MARKERS = new Set([
  "Jaws.Cast",
  "Slam.Cast",
  "Beam.Cast",
  "ShckWv.Cast",
  "Scream.Cast",
]);

const GENERIC_CAST_MARKER_PATTERN = /^[A-Za-z]+\.Cast\.-?\d+$/;

export function isNoiseMechanic(mechanicName: string): boolean {
  if (VISIBLE_CAST_MARKERS.has(mechanicName)) return false;
  if (GENERIC_CAST_MARKER_PATTERN.test(mechanicName)) return true;
  return NOISE_MECHANIC_NAMES.has(mechanicName);
}

/** Curated cast markers get their own timeline tick — excluded from fail-count aggregation/expand-panel lists (same reasoning as "Dead"). */
export function isVisibleCastMarker(mechanicName: string): boolean {
  return VISIBLE_CAST_MARKERS.has(mechanicName);
}
