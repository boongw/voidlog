import { prisma } from "@voidlog/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function LogAnalysisPage(
  props: PageProps<"/projects/[projectId]/batches/[batchId]/logs/[logFileId]">,
) {
  const { projectId, batchId, logFileId } = await props.params;
  const session = await requireSession();
  await requireProjectMembership(projectId, session.user.id);

  const logFile = await prisma.logFile.findUnique({
    where: { id: logFileId },
    include: {
      batch: true,
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
  });

  if (
    !logFile ||
    logFile.batchId !== batchId ||
    logFile.batch.projectId !== projectId ||
    !logFile.encounterResult
  ) {
    notFound();
  }

  const encounter = logFile.encounterResult;

  // The DB persists PhaseResult.playersAliveAtStart as a count only; we
  // recompute *who* was alive here from the persisted Dead MechanicEvents
  // (ADR-009) so the UI can show names, not just a number.
  const earliestDeathByPlayer = new Map<string, number>();
  for (const phase of encounter.phaseResults) {
    for (const event of phase.mechanicEvents) {
      if (event.mechanicName === "Dead" && event.playerResultId) {
        const existing = earliestDeathByPlayer.get(event.playerResultId);
        if (existing === undefined || event.timeMs < existing) {
          earliestDeathByPlayer.set(event.playerResultId, event.timeMs);
        }
      }
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/projects/${projectId}/batches/${batchId}`}
        className="text-muted hover:text-foreground text-sm"
      >
        ← {logFile.batch.label}
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{encounter.bossName}</h1>
        <span className={encounter.success ? "text-success" : "text-danger"}>
          {encounter.success ? "Success" : "Wipe"} · {Math.round(encounter.durationMs / 1000)}s
        </span>
      </div>
      {logFile.externalReportUrl ? (
        <a
          href={logFile.externalReportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-1 inline-block text-sm underline"
        >
          Full EI report ↗
        </a>
      ) : null}

      <section className="mt-6">
        <h2 className="font-medium">Roster</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {encounter.playerResults.map((p) => (
            <li key={p.id} className="border-line rounded-md border px-2 py-1 text-sm">
              {p.characterName}{" "}
              <span className="text-muted">
                ({p.profession}, {p.dps} dps)
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 flex flex-col gap-4">
        {encounter.phaseResults.map((phase) => {
          const aliveAtStart = encounter.playerResults.filter((p) => {
            const deathTime = earliestDeathByPlayer.get(p.id);
            return deathTime === undefined || deathTime > phase.startMs;
          });
          return (
            <div key={phase.id} className="border-line rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{phase.name}</h3>
                <span className={phase.success ? "text-success" : "text-danger"}>
                  {phase.reached ? (phase.success ? "Success" : "Not cleared") : "Not reached"}
                </span>
              </div>
              <p className="text-muted mt-1 text-sm">
                {(phase.startMs / 1000).toFixed(1)}s – {(phase.endMs / 1000).toFixed(1)}s ·{" "}
                {aliveAtStart.length}/{encounter.playerResults.length} alive at start
              </p>
              <p className="text-muted mt-1 text-sm">
                Alive: {aliveAtStart.map((p) => p.characterName).join(", ") || "—"}
              </p>

              {phase.mechanicEvents.length > 0 ? (
                <ul className="divide-line mt-3 divide-y">
                  {phase.mechanicEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between py-1 text-sm">
                      <span>
                        {event.displayName}
                        {event.playerResult ? ` — ${event.playerResult.characterName}` : ""}
                      </span>
                      <span className="text-muted">
                        {((event.timeMs - phase.startMs) / 1000).toFixed(1)}s ·{" "}
                        {event.category.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-3 text-sm">No mechanics recorded.</p>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
