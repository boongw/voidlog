import { MechanicCategory, prisma } from "@voidlog/db";
import type { BossConfig, MechanicCategory as SharedMechanicCategory } from "@voidlog/shared";
import { DEATH_MECHANIC_NAME } from "./ei-json-shape";
import type { ExtractedEncounter } from "./extract-encounter";

const CATEGORY_MAP: Record<SharedMechanicCategory, MechanicCategory> = {
  mistake: MechanicCategory.MISTAKE,
  stealth: MechanicCategory.STEALTH,
  reveal: MechanicCategory.REVEAL,
  green: MechanicCategory.GREEN,
  boss_specific: MechanicCategory.BOSS_SPECIFIC,
};

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "unknown"
  );
}

/**
 * Maps the streamed-out EI JSON subset (extract-encounter.ts) onto the
 * DB schema (ADR-005/009) and writes it in a single transaction.
 *
 * Simplifications for the step-2 minimal extraction, deliberately not
 * hardened further ("ein einzelner Test-Boss reicht"):
 * - PhaseResult.success: true for every phase except the last, which
 *   takes the overall encounter result. The raw EI phases array doesn't
 *   carry a per-phase success flag.
 * - PlayerResult.dps/deaths/downs read index 0 of dpsAll/defenses
 *   (assumed to be "all phases combined").
 */
export async function persistExtractedEncounter(
  logFileId: string,
  extracted: ExtractedEncounter,
  bossConfig: BossConfig | undefined,
): Promise<string> {
  const { root, players } = extracted;

  const durationMs = root.durationMS ?? root.duration;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    throw new Error('EI JSON is missing a numeric "durationMS"/"duration" field');
  }

  const bossId =
    root.triggerID !== undefined ? String(root.triggerID) : slugify(root.fightName ?? "unknown");
  const bossName = root.fightName ?? "Unknown Encounter";

  const sortedPhases = [...root.phases].sort((a, b) => a.start - b.start);

  const deathMechanic = (root.mechanics ?? []).find((m) => m.name === DEATH_MECHANIC_NAME);
  const earliestDeathByActor = new Map<string, number>();
  for (const dataPoint of deathMechanic?.mechanicsData ?? []) {
    const existing = earliestDeathByActor.get(dataPoint.actor);
    if (existing === undefined || dataPoint.time < existing) {
      earliestDeathByActor.set(dataPoint.actor, dataPoint.time);
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const encounter = await tx.encounterResult.create({
        data: {
          logFileId,
          bossId,
          bossName,
          success: root.success,
          durationMs: Math.round(durationMs),
        },
      });

      const playerIdByCharacterName = new Map<string, string>();
      for (const player of players) {
        const dps = player.dpsAll?.[0]?.dps ?? 0;
        const deaths = player.defenses?.[0]?.deadCount ?? 0;
        const downs = player.defenses?.[0]?.downCount ?? 0;
        const created = await tx.playerResult.create({
          data: {
            encounterResultId: encounter.id,
            account: player.account,
            characterName: player.name,
            profession: player.profession,
            group: player.group ?? null,
            dps: Math.round(dps),
            deaths: Math.round(deaths),
            downs: Math.round(downs),
          },
        });
        playerIdByCharacterName.set(player.name, created.id);
      }

      const totalPlayers = players.length;
      const phaseIdsInOrder: string[] = [];
      for (let i = 0; i < sortedPhases.length; i++) {
        const phase = sortedPhases[i]!;
        const isLast = i === sortedPhases.length - 1;
        const playersAliveAtStart =
          totalPlayers -
          [...earliestDeathByActor.values()].filter((deathTime) => deathTime <= phase.start).length;

        const createdPhase = await tx.phaseResult.create({
          data: {
            encounterResultId: encounter.id,
            name: phase.name,
            order: i,
            startMs: Math.round(phase.start),
            endMs: Math.round(phase.end),
            reached: true,
            success: isLast ? root.success : true,
            playersAliveAtStart,
          },
        });
        phaseIdsInOrder.push(createdPhase.id);
      }

      function resolvePhaseIndex(timeMs: number): number {
        for (let i = 0; i < sortedPhases.length; i++) {
          const phase = sortedPhases[i]!;
          if (timeMs >= phase.start && timeMs < phase.end) return i;
        }
        return timeMs < sortedPhases[0]!.start ? 0 : sortedPhases.length - 1;
      }

      for (const mechanic of root.mechanics ?? []) {
        const mapping = bossConfig?.mechanics.find((m) => m.rawName === mechanic.name);
        const category = CATEGORY_MAP[mapping?.category ?? "boss_specific"];
        const displayName = mapping?.displayName ?? mechanic.name;

        for (const dataPoint of mechanic.mechanicsData) {
          const phaseIndex = resolvePhaseIndex(dataPoint.time);
          await tx.mechanicEvent.create({
            data: {
              phaseResultId: phaseIdsInOrder[phaseIndex]!,
              playerResultId: playerIdByCharacterName.get(dataPoint.actor) ?? null,
              mechanicName: mechanic.name,
              category,
              displayName,
              timeMs: Math.round(dataPoint.time),
            },
          });
        }
      }

      return encounter.id;
    },
    { timeout: 30_000 },
  );
}
