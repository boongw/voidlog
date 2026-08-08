/**
 * Minimal shape of an Elite Insights JSON report, restricted to the
 * fields the extractor (ADR-008) actually reads.
 *
 * `duration`/`success`/`isCM`, `phases[]`, and `mechanics[].mechanicsData[]`
 * field names come directly from the empirical analysis in ADR-008/ADR-005.
 * `triggerID`/`fightName` (boss id/name) and the exact internal shape of
 * `dpsAll`/`defenses` per player are NOT confirmed by the ADR text — they
 * are this codebase's best-effort assumption based on common EI JSON
 * versions, kept isolated here so they're easy to correct once verified
 * against one real dps.report response (see README "Step 2" notes).
 */

export interface EiPhase {
  name: string;
  start: number;
  end: number;
}

export interface EiMechanicDataPoint {
  time: number;
  actor: string;
}

export interface EiMechanic {
  name: string;
  description?: string;
  mechanicsData: EiMechanicDataPoint[];
}

export interface EiPlayerDpsAllEntry {
  dps?: number;
}

export interface EiPlayerDefensesEntry {
  deadCount?: number;
  downCount?: number;
}

export interface EiPlayer {
  account: string;
  name: string;
  profession: string;
  group?: number;
  /** Per-phase array; index 0 is assumed to be "all phases combined". */
  dpsAll?: EiPlayerDpsAllEntry[];
  /** Per-phase array; index 0 is assumed to be "all phases combined". */
  defenses?: EiPlayerDefensesEntry[];
  // statsAll, support, deathRecap, consumables, activeTimes are read by
  // dps.report/EI too but not needed for the step-2 minimal extraction.
}

/** One cast of `id` (a skill id, matching a `skillMap` key without the "s" prefix). */
export interface EiRotationEntry {
  id: number;
  skills: { castTime: number }[];
}

export interface EiTarget {
  name: string;
  /** Absent for targets EI didn't track a cast log for (e.g. static hazards). */
  rotation?: EiRotationEntry[];
}

export interface EiSkillMapEntry {
  name: string;
}

export interface EiRoot {
  fightName?: string;
  triggerID?: number;
  durationMS?: number;
  duration?: number;
  success: boolean;
  isCM?: boolean;
  phases: EiPhase[];
  mechanics: EiMechanic[];
  players: EiPlayer[];
  targets: EiTarget[];
  /** Keyed by e.g. "s65704" (an "s" prefix + the numeric skill id). */
  skillMap: Record<string, EiSkillMapEntry>;
  /**
   * When the fight actually started in-game, e.g. "2026-08-04 15:54:24
   * -04:00" — not ISO 8601 (space instead of "T", space before the UTC
   * offset). Use `parseEiTimestamp` below, not `new Date()` directly.
   */
  timeStartStd?: string;
}

/** Converts EI's non-ISO `timeStartStd` into a Date, or undefined if absent/unparseable. */
export function parseEiTimestamp(timeStartStd: string | undefined): Date | undefined {
  if (!timeStartStd) return undefined;
  const isoish = timeStartStd.replace(" ", "T").replace(" ", "");
  const date = new Date(isoish);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Raw mechanic name used to derive PhaseResult.playersAliveAtStart (ADR-009). */
export const DEATH_MECHANIC_NAME = "Dead";
