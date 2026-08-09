import { LogFileStatus, MechanicCategory, prisma } from "@voidlog/db";
import { Card } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { PhaseBadge } from "@/components/phase-badge";
import { isMainPhase } from "@/lib/main-phases";
import { translateMechanicName } from "@/lib/mechanic-names";
import { isNoiseMechanic, isVisibleCastMarker } from "@/lib/mechanics";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { BatchAttempts, type AttemptRow, type BatchPhaseStat } from "./batch-attempts";
import { DeleteBatchButton } from "./delete-batch-button";
import { RemoveLogButton } from "./remove-log-button";
import { RetryLogButton } from "./retry-log-button";

// storageKeyRaw looks like "raw/<batchId>/<uuid>-<sanitized filename>" — strip
// the batch/uuid prefix so failed uploads show the original filename.
function displayFileName(storageKeyRaw: string): string {
  const last = storageKeyRaw.split("/").pop() ?? storageKeyRaw;
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, "");
}

export default async function BatchDetailPage(
  props: PageProps<"/projects/[projectId]/batches/[batchId]">,
) {
  const { projectId, batchId } = await props.params;
  const session = await requireSession();
  await requireProjectMembership(projectId, session.user.id);

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
    include: {
      logFiles: {
        orderBy: { createdAt: "asc" },
        include: {
          encounterResult: {
            include: {
              playerResults: true,
              phaseResults: {
                orderBy: { order: "asc" },
                include: {
                  mechanicEvents: { include: { playerResult: true }, orderBy: { timeMs: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!batch || batch.projectId !== projectId) {
    notFound();
  }

  const encounters = batch.logFiles
    .map((logFile) =>
      logFile.encounterResult ? { logFile, encounter: logFile.encounterResult } : null,
    )
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const failedLogFiles = batch.logFiles.filter((f) => f.status === LogFileStatus.FAILED);

  const attempts = encounters.length;
  const revealReached = encounters.filter((e) =>
    e.encounter.phaseResults.some((p) =>
      p.mechanicEvents.some((m) => m.category === MechanicCategory.REVEAL),
    ),
  ).length;
  // "F.Green" is HTCM's raw EI mechanic code for a failed Green stack (see
  // harvest-temple.ts) — hardcoded like the timeline's attack glyphs
  // elsewhere in this batch view, pending a boss-pluggable stat-card system.
  const greenFailedCount = encounters.filter((e) =>
    e.encounter.phaseResults.some((p) =>
      p.mechanicEvents.some((m) => m.mechanicName === "F.Green"),
    ),
  ).length;

  // Assumes one boss per batch (true for every real batch so far) — used
  // for the aggregate phase cards and the client-side timeline component,
  // which both need a single bossId to resolve curated colors/mechanics.
  const batchBossId = encounters[0]?.encounter.bossId ?? "";

  let furthestPhase: { name: string; order: number; bossId: string } | null = null;
  for (const { encounter } of encounters) {
    for (const phase of encounter.phaseResults) {
      if (
        phase.reached &&
        isMainPhase(encounter.bossId, phase.name) &&
        (!furthestPhase || phase.order > furthestPhase.order)
      ) {
        furthestPhase = { ...phase, bossId: encounter.bossId };
      }
    }
  }

  // Keyed by phase *name*, not order: EI assigns `order` per attempt based
  // on how many breakbar/CM sub-phases fired before it, so the same named
  // phase (e.g. "Purification 2") can land at different order values across
  // attempts. Grouping by order would then split it into duplicate cards.
  const phaseAgg = new Map<
    string,
    {
      name: string;
      order: number;
      reachedCount: number;
      mechanics: Map<string, { displayName: string; count: number }>;
    }
  >();
  for (const { encounter } of encounters) {
    for (const phase of encounter.phaseResults) {
      if (!isMainPhase(encounter.bossId, phase.name)) continue;
      const agg = phaseAgg.get(phase.name) ?? {
        name: phase.name,
        order: phase.order,
        reachedCount: 0,
        mechanics: new Map<string, { displayName: string; count: number }>(),
      };
      agg.order = Math.min(agg.order, phase.order);
      if (phase.reached) agg.reachedCount += 1;
      for (const event of phase.mechanicEvents) {
        // Visible cast markers (Jaws/Slam/Beam/ShckWv/Scream — see
        // cast-markers.ts on the worker) are synthetic orientation markers
        // (every cast), not a fail, so they're excluded from fail-count
        // aggregation here even though they're still included in the raw
        // `mechanics` array below (that feeds the timeline tick).
        if (
          event.mechanicName === "Dead" ||
          isVisibleCastMarker(encounter.bossId, event.mechanicName) ||
          isNoiseMechanic(encounter.bossId, event.mechanicName)
        )
          continue;
        const entry = agg.mechanics.get(event.mechanicName) ?? {
          displayName: translateMechanicName(
            encounter.bossId,
            event.mechanicName,
            event.displayName,
          ),
          count: 0,
        };
        entry.count += 1;
        agg.mechanics.set(event.mechanicName, entry);
      }
      phaseAgg.set(phase.name, agg);
    }
  }
  const batchPhaseStats: BatchPhaseStat[] = [...phaseAgg.values()]
    .sort((a, b) => a.order - b.order)
    .map((agg) => ({
      name: agg.name,
      order: agg.order,
      reached: agg.reachedCount,
      total: attempts,
      mechanics: [...agg.mechanics.values()].sort((a, b) => b.count - a.count).slice(0, 3),
    }));

  const attemptRows: AttemptRow[] = encounters.map(({ logFile, encounter }, i) => {
    const mainPhases = encounter.phaseResults.filter((p) => isMainPhase(encounter.bossId, p.name));
    const reachedMainPhases = mainPhases.filter((p) => p.reached);
    const furthest = reachedMainPhases.at(-1) ?? null;
    return {
      logFileId: logFile.id,
      bossId: encounter.bossId,
      n: i + 1,
      success: encounter.success,
      furthestPhase: furthest ? { name: furthest.name, order: furthest.order } : null,
      durationMs: encounter.durationMs,
      segments: reachedMainPhases.map((p) => ({
        name: p.name,
        order: p.order,
        leftPct: (p.startMs / encounter.durationMs) * 100,
        widthPct: ((p.endMs - p.startMs) / encounter.durationMs) * 100,
      })),
      // Deaths/mechanic fails are time markers, not phase-progression UI — keep
      // them from every phase result (including EI's auto-generated breakbar
      // sub-phases, where most mechanic-fail events actually get recorded),
      // unlike segments/phases below which are curated to main boss phases.
      deaths: encounter.phaseResults.flatMap((p) =>
        p.mechanicEvents
          .filter((m) => m.mechanicName === "Dead")
          .map((m) => ({ timeMs: m.timeMs, player: m.playerResult?.characterName ?? null })),
      ),
      mechanics: encounter.phaseResults.flatMap((p) =>
        p.mechanicEvents
          .filter(
            (m) => m.mechanicName !== "Dead" && !isNoiseMechanic(encounter.bossId, m.mechanicName),
          )
          .map((m) => ({
            timeMs: m.timeMs,
            name: translateMechanicName(encounter.bossId, m.mechanicName, m.displayName),
            mechanicName: m.mechanicName,
          })),
      ),
      phases: mainPhases.map((p) => {
        // Don't rely on p.mechanicEvents here: persistence assigns each
        // event to the *narrowest* containing PhaseResult (resolvePhaseIndex
        // in persist-encounter.ts), which is often an auto-generated
        // breakbar/intermission sub-phase nested inside this main phase
        // (e.g. "Grav.Cru.H" events land under "Void Time Caster", not
        // "Purification 2") — those would silently vanish from the filter
        // groups below even though they still show up in the `mechanics`
        // field above (built from *all* phaseResults). Re-bucket by time
        // range instead, so every event that happened during this phase's
        // window is included regardless of which sub-phase record it's
        // attached to.
        const eventsInRange = encounter.phaseResults
          .flatMap((pr) => pr.mechanicEvents)
          .filter((m) => m.timeMs >= p.startMs && m.timeMs < p.endMs);
        return {
          name: p.name,
          order: p.order,
          reached: p.reached,
          success: p.success,
          // Keeps cast markers (boss attacks) in here too, unlike the death/
          // fail-only `mechanics` field above — the client needs them to
          // build the per-phase attack filter groups. isVisibleCastMarker is
          // applied client-side only when rendering the plain-text mechanic
          // list.
          mechanics: eventsInRange
            .filter(
              (m) => m.mechanicName !== "Dead" && !isNoiseMechanic(encounter.bossId, m.mechanicName),
            )
            .map((m) => ({
              mechanicName: m.mechanicName,
              name: translateMechanicName(encounter.bossId, m.mechanicName, m.displayName),
              player: m.playerResult?.characterName ?? null,
            })),
        };
      }),
    };
  });

  return (
    <div className="px-10 py-8">
      <div className="mb-6 flex items-start justify-between">
        <h1 className="font-heading text-foreground-strong text-2xl font-bold">{batch.label}</h1>
        <DeleteBatchButton projectId={projectId} batchId={batchId} batchLabel={batch.label} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card size="2" className="border-line bg-surface border">
          <div className="text-muted mb-1.5 text-[11px] font-medium uppercase tracking-wide">
            Versuche gesamt
          </div>
          <div className="font-heading text-foreground text-xl font-bold">{attempts}</div>
        </Card>
        <Card size="2" className="border-line bg-surface border">
          <div className="text-muted mb-1.5 text-[11px] font-medium uppercase tracking-wide">
            Mit Reveal erreicht
          </div>
          <div className="font-heading text-foreground text-xl font-bold">
            {revealReached}{" "}
            <span className="text-muted text-sm font-medium">
              ({attempts > 0 ? Math.round((revealReached / attempts) * 100) : 0}%)
            </span>
          </div>
        </Card>
        <Card size="2" className="border-line bg-surface border">
          <div className="text-muted mb-1.5 text-[11px] font-medium uppercase tracking-wide">
            Green verfehlt
          </div>
          <div className="font-heading text-danger text-xl font-bold">
            {greenFailedCount}{" "}
            <span className="text-muted text-sm font-medium">
              ({attempts > 0 ? Math.round((greenFailedCount / attempts) * 100) : 0}%)
            </span>
          </div>
        </Card>
        <Card size="2" className="border-line bg-surface border">
          <div className="text-muted mb-1.5 text-[11px] font-medium uppercase tracking-wide">
            Weiteste Phase
          </div>
          {furthestPhase ? (
            <PhaseBadge
              bossId={furthestPhase.bossId}
              name={furthestPhase.name}
              order={furthestPhase.order}
            />
          ) : (
            <span className="text-muted text-sm">—</span>
          )}
        </Card>
      </div>

      {failedLogFiles.length > 0 ? (
        <div className="mb-6">
          <div className="text-muted-strong mb-2.5 text-sm font-semibold">
            Fehlgeschlagene Uploads
          </div>
          <div className="border-line bg-surface divide-line-soft flex flex-col divide-y rounded-sm border">
            {failedLogFiles.map((logFile) => (
              <div key={logFile.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-foreground truncate font-mono text-xs">
                    {displayFileName(logFile.storageKeyRaw)}
                  </div>
                  {logFile.errorMessage ? (
                    <div className="text-danger mt-1 truncate text-xs">{logFile.errorMessage}</div>
                  ) : null}
                </div>
                <div className="flex items-start gap-2">
                  <RetryLogButton logFileId={logFile.id} />
                  <RemoveLogButton logFileId={logFile.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <BatchAttempts
        projectId={projectId}
        batchId={batchId}
        bossId={batchBossId}
        attempts={attemptRows}
        batchPhaseStats={batchPhaseStats}
      />
    </div>
  );
}
