/**
 * Boss-ability casts synthesized as MechanicEvent rows independent of
 * whether any player actually got hit. EI's `mechanics[]` only records
 * *hits* (e.g. "Jaws.H" for Primordus's Jaws of Destruction) — a cast the
 * whole group dodged never appears there, so a "when does this attack
 * happen" timeline marker built from `mechanics[]` alone silently misses
 * casts (confirmed on a real Harvest Temple CM log: 2 actual Jaws casts,
 * only 1 corresponding "Jaws.H" hit).
 *
 * `targets[].rotation` (EI's per-target cast log, keyed by skill id) has
 * every cast regardless of outcome — that's the source here.
 *
 * Two layers:
 * - `CURATED_CAST_MARKERS_BY_BOSS`: individually named/relevant attacks,
 *   shown as distinct timeline ticks in the UI (see batch-attempts.tsx).
 * - `CAST_TARGET_GROUPS_BY_BOSS`: every *other* rotation skill for these
 *   targets is captured too (generic "<group>.Cast.<skillId>" name, skill
 *   name from `skillMap`), so the data already exists for later analysis
 *   even before it's individually curated. Not surfaced in the UI yet
 *   (see `isNoiseMechanic` on the web side).
 */
export interface CuratedCastMarker {
  /** Matched against EiTarget.name (exact match — EI target names are stable). */
  targetName: string;
  /** Numeric skill id, matching `skillMap`'s "s<id>" key and `rotation[].id`. */
  skillId: number;
  /** MechanicEvent.mechanicName — reuses the boss's existing ".H" hit-mechanic stem with a ".Cast" suffix, so it reads consistently with the rest of mechanic-names.ts. */
  mechanicName: string;
  displayName: string;
}

export const CURATED_CAST_MARKERS_BY_BOSS: Record<string, CuratedCastMarker[]> = {
  // Harvest Temple CM (Dragon's End)
  "43488": [
    {
      targetName: "The PrimordusVoid",
      skillId: 65704,
      mechanicName: "Jaws.Cast",
      displayName: "Jaws of Destruction (Cast)",
    },
    {
      targetName: "The PrimordusVoid",
      skillId: 65427,
      mechanicName: "Slam.Cast",
      displayName: "Lava Slam (Cast)",
    },
    {
      targetName: "The KralkatorrikVoid",
      skillId: 65017,
      mechanicName: "Beam.Cast",
      displayName: "Branding Beam (Cast)",
    },
    {
      targetName: "The MordremothVoid",
      skillId: 64810,
      mechanicName: "ShckWv.Cast",
      displayName: "Mordremoth Shockwave (Cast)",
    },
    {
      targetName: "The ZhaitanVoid",
      skillId: 64428,
      mechanicName: "Scream.Cast",
      displayName: "Zhaitan Scream (Cast)",
    },
  ],
};

export interface CastTargetGroup {
  /** Used to build the generic mechanicName: "<groupKey>.Cast.<skillId>". */
  groupKey: string;
  /**
   * Target names merged into this one group — e.g. all three "Riese der
   * Leere" adds share a group so it's not tracked which specific giant
   * cast the attack, only that a giant did.
   */
  targetNames: string[];
}

export const CAST_TARGET_GROUPS_BY_BOSS: Record<string, CastTargetGroup[]> = {
  "43488": [
    { groupKey: "Jormag", targetNames: ["The JormagVoid"] },
    { groupKey: "Primordus", targetNames: ["The PrimordusVoid"] },
    { groupKey: "Kralkatorrik", targetNames: ["The KralkatorrikVoid"] },
    { groupKey: "Mordremoth", targetNames: ["The MordremothVoid"] },
    { groupKey: "Zhaitan", targetNames: ["The ZhaitanVoid"] },
    { groupKey: "SooWon", targetNames: ["The SooWonVoid"] },
    { groupKey: "TimeCaster", targetNames: ["Zeitzauberer der Leere"] },
    { groupKey: "Giant", targetNames: ["Riese der Leere 1", "Riese der Leere 2", "Riese der Leere 3"] },
    { groupKey: "SaltsprayDragon", targetNames: ["Leere-Salzgischtdrachen"] },
  ],
};

/** EI's synthetic "target became active" marker, not a real attack. */
export const EXCLUDED_ROTATION_SKILL_IDS = new Set([-2]);
