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
}

/** Raw mechanic name used to derive PhaseResult.playersAliveAtStart (ADR-009). */
export const DEATH_MECHANIC_NAME = "Dead";
