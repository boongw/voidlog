import { Readable } from "node:stream";
import type { LogParser, ParsedLogHandle } from "@voidlog/shared";
import { TEST_BOSS_ID } from "../boss-configs/test-boss";

/**
 * Fixture EI JSON used by MockParser (ADR-002: "tests without an
 * external dependency"). Deliberately includes large, irrelevant sibling
 * fields per player (buffUptimes/selfBuffs) and a bulky `targets` block,
 * to exercise the selective extractor (ADR-008): it must skip that
 * content without materializing it.
 */
function buildFixtureJson(): Record<string, unknown> {
  const bulkyIrrelevantField = Array.from({ length: 500 }, (_, i) => ({
    id: i,
    uptime: Math.random(),
    buffInstances: Array.from({ length: 20 }, (_, j) => ({ start: j * 1000, end: j * 1000 + 500 })),
  }));

  return {
    fightName: "Void Training Golem",
    triggerID: Number(TEST_BOSS_ID),
    durationMS: 180_000,
    success: true,
    isCM: false,
    phases: [
      { name: "Opening Burst", start: 0, end: 30_000 },
      { name: "Main Phase", start: 30_000, end: 150_000 },
      { name: "Enrage", start: 150_000, end: 180_000 },
    ],
    mechanics: [
      {
        name: "Test.MissedDodge",
        description: "Failed to dodge a telegraphed attack",
        mechanicsData: [
          { time: 12_000, actor: "Alice" },
          { time: 95_000, actor: "Bob" },
        ],
      },
      {
        name: "Test.Stealth",
        description: "Entered stealth",
        mechanicsData: [{ time: 40_000, actor: "Carol" }],
      },
      {
        name: "Test.GreenStack",
        description: "Stacked on the assigned green",
        mechanicsData: [
          { time: 60_000, actor: "Alice" },
          { time: 60_000, actor: "Bob" },
        ],
      },
      {
        name: "Dead",
        description: "Player died",
        mechanicsData: [{ time: 160_000, actor: "Bob" }],
      },
    ],
    // Intentionally large/irrelevant and must be skipped entirely.
    targets: [{ name: "Void Training Golem", irrelevantWall: "x".repeat(10_000) }],
    players: [
      {
        account: "Alice.1234",
        name: "Alice",
        profession: "Guardian",
        group: 1,
        dpsAll: [{ dps: 24_500 }],
        defenses: [{ deadCount: 0, downCount: 1 }],
        buffUptimes: bulkyIrrelevantField,
        selfBuffs: bulkyIrrelevantField,
      },
      {
        account: "Bob.5678",
        name: "Bob",
        profession: "Necromancer",
        group: 1,
        dpsAll: [{ dps: 21_800 }],
        defenses: [{ deadCount: 1, downCount: 1 }],
        buffUptimes: bulkyIrrelevantField,
        selfBuffs: bulkyIrrelevantField,
      },
      {
        account: "Carol.9012",
        name: "Carol",
        profession: "Mesmer",
        group: 2,
        dpsAll: [{ dps: 19_300 }],
        defenses: [{ deadCount: 0, downCount: 0 }],
        buffUptimes: bulkyIrrelevantField,
        selfBuffs: bulkyIrrelevantField,
      },
    ],
  };
}

export class MockParser implements LogParser {
  async parse(_rawFileRef: string): Promise<ParsedLogHandle> {
    const buffer = Buffer.from(JSON.stringify(buildFixtureJson()), "utf8");

    // Feed the stream in small chunks rather than one buffer, so the
    // streaming extractor is genuinely exercised across chunk boundaries.
    const chunkSize = 256;
    const chunks: Buffer[] = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      chunks.push(buffer.subarray(i, i + chunkSize));
    }

    const jsonStream = Readable.from(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })(),
    );

    return {
      reportUrl: "https://dps.report/mock-permalink",
      jsonStream,
    };
  }
}
