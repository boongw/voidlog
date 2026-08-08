/**
 * Boss-ability casts to synthesize as MechanicEvent rows independent of
 * whether any player actually got hit. EI's `mechanics[]` only records
 * *hits* (e.g. "Jaws.H" for Primordus's Jaws of Destruction) — a cast the
 * whole group dodged never appears there, so a "when does this attack
 * happen" timeline marker built from `mechanics[]` alone silently misses
 * casts (confirmed on a real Harvest Temple CM log: 2 actual Jaws casts,
 * only 1 corresponding "Jaws.H" hit).
 *
 * `targets[].rotation` (EI's per-target cast log, keyed by skill id) has
 * every cast regardless of outcome. This is a small, hand-curated list of
 * (boss, target, skill) triples to pull from there — mirrors main-phases.ts
 * / mechanic-names.ts in scope (curate what's needed, not every boss).
 */
export interface CastMarker {
  /** Matched against EiTarget.name (exact match — EI target names are stable). */
  targetName: string;
  /** Numeric skill id, matching `skillMap`'s "s<id>" key and `rotation[].id`. */
  skillId: number;
  /** Synthetic MechanicEvent.mechanicName — namespaced with ".Cast" so it can't collide with a real EI mechanic code. */
  mechanicName: string;
  displayName: string;
}

export const CAST_MARKERS_BY_BOSS: Record<string, CastMarker[]> = {
  // Harvest Temple CM (Dragon's End)
  "43488": [
    {
      targetName: "The PrimordusVoid",
      skillId: 65704,
      mechanicName: "Jaws.Cast",
      displayName: "Jaws of Destruction (Cast)",
    },
  ],
};
