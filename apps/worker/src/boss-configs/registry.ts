import type { BossConfig } from "@voidlog/shared";
import { TEST_BOSS_ID, testBossConfig } from "./test-boss.js";

const registry = new Map<string, BossConfig>([[TEST_BOSS_ID, testBossConfig]]);

/**
 * Returns undefined for a boss without a curated config — extraction
 * falls back to category "boss_specific" for every one of its mechanics
 * in that case (ADR-009), so unconfigured real bosses still extract
 * successfully, just without categorization.
 */
export function getBossConfig(bossId: string): BossConfig | undefined {
  return registry.get(bossId);
}
