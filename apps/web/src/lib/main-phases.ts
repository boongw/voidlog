/**
 * Curated "top-level" phase names per boss (by bossId), so aggregate/
 * summary views (furthest-phase badges, batch-wide timeline stats) only
 * surface phases that matter for progression tracking — not Elite
 * Insights' auto-generated breakbar/CM sub-phases (e.g. "Heart 2
 * Breakbar 1"), which the worker currently persists unfiltered as
 * PhaseResult rows alongside the real ones.
 *
 * Detailed views (single-log breakdown, per-attempt timeline segments)
 * intentionally keep showing every phase — this filter is only for
 * summaries where sub-phase noise drowns out the boss progression.
 *
 * Bosses without an entry here are left unfiltered (every phase counts
 * as "main") until curated.
 */
const MAIN_PHASES_BY_BOSS: Record<string, string[]> = {
  // Harvest Temple CM (Dragon's End, Soo-Won) — the six dragon phases.
  "43488": ["Jormag", "Primordus", "Kralkatorrik", "Mordremoth", "Zhaitan", "Soo-Won"],
};

export function isMainPhase(bossId: string, phaseName: string): boolean {
  const mainPhases = MAIN_PHASES_BY_BOSS[bossId];
  return !mainPhases || mainPhases.includes(phaseName);
}
