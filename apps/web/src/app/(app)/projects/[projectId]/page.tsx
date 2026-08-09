import { ProjectRole, prisma } from "@voidlog/db";
import { Card, Table } from "@radix-ui/themes";
import Link from "next/link";
import { PhaseBadge } from "@/components/phase-badge";
import { isMainPhase } from "@/lib/main-phases";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { DeleteProjectButton } from "./delete-project-button";
import { TrendChart } from "./trend-chart";

export default async function ProjectDetailPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const rawBatches = await prisma.uploadBatch.findMany({
    where: { projectId },
    select: {
      id: true,
      label: true,
      createdAt: true,
      logFiles: {
        select: {
          encounterResult: {
            select: {
              bossId: true,
              success: true,
              recordedAt: true,
              phaseResults: { select: { name: true, order: true, reached: true } },
              playerResults: { select: { dps: true } },
            },
          },
        },
      },
    },
  });

  const batches = rawBatches
    .map((batch) => {
      const encounters = batch.logFiles
        .map((f) => f.encounterResult)
        .filter((e): e is NonNullable<typeof e> => e !== null);

      const kills = encounters.filter((e) => e.success).length;
      const successRate =
        encounters.length > 0 ? Math.round((kills / encounters.length) * 100) : null;
      const avgGroupDps =
        encounters.length > 0
          ? Math.round(
              encounters.reduce(
                (sum, e) => sum + e.playerResults.reduce((s, p) => s + p.dps, 0),
                0,
              ) / encounters.length,
            )
          : 0;

      let furthestPhase: { name: string; order: number; bossId: string } | null = null;
      for (const encounter of encounters) {
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

      // Prefer the earliest in-game recording time across the batch's logs
      // (EI's timeStartStd) over upload time, so the trend/list reflect
      // when the raid actually happened, not upload order. Falls back to
      // `createdAt` for logs parsed before that field existed.
      const recordedTimestamps = encounters
        .map((e) => e.recordedAt)
        .filter((d): d is Date => d !== null);
      const occurredAt =
        recordedTimestamps.length > 0
          ? new Date(Math.min(...recordedTimestamps.map((d) => d.getTime())))
          : batch.createdAt;

      return {
        id: batch.id,
        label: batch.label,
        createdAt: batch.createdAt,
        occurredAt,
        attempts: encounters.length,
        kills,
        successRate,
        avgGroupDps,
        furthestPhase,
      };
    })
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const trendPoints = batches
    .slice(0, 10)
    .reverse()
    .filter((b) => b.attempts > 0);

  return (
    <div className="px-10 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-foreground-strong text-2xl font-bold">
            {membership.project.name}
          </h1>
          <p className="text-muted mt-1 text-sm">{batches.length} Raid-Abende getrackt</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/batches/new`}
            className="bg-primary text-primary-foreground rounded-sm px-3.5 py-2 text-sm font-semibold"
          >
            + Batch hochladen
          </Link>
          {membership.role === ProjectRole.OWNER ? (
            <DeleteProjectButton projectId={projectId} projectName={membership.project.name} />
          ) : null}
        </div>
      </div>

      {trendPoints.length >= 2 ? (
        <Card size="3" className="border-line bg-surface mb-6 border">
          <div className="text-muted-strong mb-3.5 text-xs font-medium uppercase tracking-wide">
            Ø Gruppen-DPS · letzte {trendPoints.length} Abende
          </div>
          <TrendChart points={trendPoints} />
        </Card>
      ) : null}

      <div className="text-muted-strong mb-2.5 text-sm font-semibold">Raid-Abende</div>
      <Table.Root variant="surface" className="border-line bg-surface border">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Raid-Abend</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Versuche</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Kills</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Erfolgsquote</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Weiteste Phase</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {batches.map((batch) => (
            <Table.Row key={batch.id}>
              <Table.Cell>
                <Link
                  href={`/projects/${projectId}/batches/${batch.id}`}
                  className="text-foreground font-semibold hover:underline"
                >
                  {batch.label}
                </Link>
              </Table.Cell>
              <Table.Cell className="text-muted-strong">{batch.attempts}</Table.Cell>
              <Table.Cell className="text-muted-strong">{batch.kills}</Table.Cell>
              <Table.Cell className="text-warning font-semibold">
                {batch.successRate === null ? "—" : `${batch.successRate}%`}
              </Table.Cell>
              <Table.Cell>
                {batch.furthestPhase ? (
                  <PhaseBadge
                    bossId={batch.furthestPhase.bossId}
                    name={batch.furthestPhase.name}
                    order={batch.furthestPhase.order}
                  />
                ) : (
                  "—"
                )}
              </Table.Cell>
            </Table.Row>
          ))}
          {batches.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5} className="text-muted">
                Noch keine Batches.
              </Table.Cell>
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
