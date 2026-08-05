import type { BossConfig } from "@voidlog/shared";

/**
 * Single test boss config (step 2 scope): proves the BossConfig ->
 * MechanicEvent.category pipeline end to end. Real per-boss configs
 * (ADR-009) get added here as bosses are onboarded in later steps.
 */
export const TEST_BOSS_ID = "99001";

export const testBossConfig: BossConfig = {
  bossId: TEST_BOSS_ID,
  bossName: "Void Training Golem",
  phases: [
    { name: "Opening Burst", order: 0 },
    { name: "Main Phase", order: 1 },
    { name: "Enrage", order: 2 },
  ],
  mechanics: [
    { rawName: "Test.MissedDodge", category: "mistake", displayName: "Missed Dodge" },
    { rawName: "Test.Stealth", category: "stealth", displayName: "Entered Stealth" },
    { rawName: "Test.GreenStack", category: "green", displayName: "Stacked on Green" },
  ],
};
