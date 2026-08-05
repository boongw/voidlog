/**
 * Boss configuration types (ADR-009).
 *
 * Per-boss mapping from raw Elite Insights output to the domain model:
 * which phases exist and in what order, and how raw mechanic names map
 * to a display category. This mapping is hand-curated per boss and
 * lives in code (TypeScript), not in an editable DB table (ADR-009).
 * The actual boss configs (Jormag, Primordus, ...) are added in step 2/3
 * as bosses are onboarded; this file only defines the shape.
 */

export type MechanicCategory = "mistake" | "stealth" | "reveal" | "green" | "boss_specific";

export interface PhaseDefinition {
  name: string;
  /** Order of the phase within the encounter, starting at 0. */
  order: number;
}

export interface MechanicMapping {
  /** Raw mechanic name as reported by Elite Insights (mechanics[].name). */
  rawName: string;
  category: MechanicCategory;
  displayName: string;
  /**
   * Whether this mechanic requires a buff-presence lookup at event time
   * (e.g. "did the player have Stability?"), stored in
   * MechanicEvent.context on ingest (ADR-009).
   */
  buffCorrelation?: {
    buffId: string;
    contextKey: string;
  };
}

export interface BossConfig {
  bossId: string;
  bossName: string;
  phases: PhaseDefinition[];
  mechanics: MechanicMapping[];
}
