import { prisma } from "@voidlog/db";
import { Table } from "@radix-ui/themes";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

interface RosterEntry {
  account: string;
  characterNames: Set<string>;
  encounters: number;
  totalDps: number;
  kills: number;
  totalDowns: number;
  roleCounts: Map<string, number>;
  lastActive: Date;
}

export default async function RosterPage(props: PageProps<"/projects/[projectId]/players">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const playerResults = await prisma.playerResult.findMany({
    where: { encounterResult: { logFile: { batch: { projectId } } } },
    select: {
      account: true,
      characterName: true,
      dps: true,
      downs: true,
      role: true,
      encounterResult: { select: { success: true, createdAt: true } },
    },
  });

  // Grouped by account, not character name — character names change,
  // the account handle doesn't (ADR-009).
  const byAccount = new Map<string, RosterEntry>();
  for (const p of playerResults) {
    const entry = byAccount.get(p.account) ?? {
      account: p.account,
      characterNames: new Set<string>(),
      encounters: 0,
      totalDps: 0,
      kills: 0,
      totalDowns: 0,
      roleCounts: new Map<string, number>(),
      lastActive: p.encounterResult.createdAt,
    };
    entry.characterNames.add(p.characterName);
    entry.encounters += 1;
    entry.totalDps += p.dps;
    entry.totalDowns += p.downs;
    if (p.encounterResult.success) entry.kills += 1;
    if (p.encounterResult.createdAt > entry.lastActive)
      entry.lastActive = p.encounterResult.createdAt;
    if (p.role) entry.roleCounts.set(p.role, (entry.roleCounts.get(p.role) ?? 0) + 1);
    byAccount.set(p.account, entry);
  }

  const roster = [...byAccount.values()]
    .map((entry) => {
      const role = [...entry.roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      return {
        account: entry.account,
        characterNames: [...entry.characterNames].join(", "),
        role,
        encounters: entry.encounters,
        kills: entry.kills,
        avgDps: Math.round(entry.totalDps / entry.encounters),
        avgDowns: (entry.totalDowns / entry.encounters).toFixed(1),
        lastActive: entry.lastActive,
      };
    })
    .sort((a, b) => b.encounters - a.encounters);

  return (
    <div className="px-10 py-8">
      <Breadcrumbs
        items={[
          { label: "Projekte", href: "/" },
          { label: membership.project.name, href: `/projects/${projectId}` },
          { label: "Roster" },
        ]}
      />
      <h1 className="font-heading text-foreground-strong text-2xl font-bold">Roster</h1>
      <p className="text-muted mb-6 mt-1 text-sm">Alle Teilnehmer seit Projektstart</p>

      <Table.Root variant="surface" className="border-line bg-surface border">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Spieler</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Rolle</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Teilnahmen</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Kills</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Ø DPS</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Ø Downs</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Zuletzt aktiv</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {roster.map((entry) => (
            <Table.Row key={entry.account}>
              <Table.Cell>
                <div className="flex items-center gap-2.5">
                  <span className="bg-line h-[22px] w-[22px] shrink-0 rounded-full" />
                  <div>
                    <div className="text-foreground font-semibold">{entry.account}</div>
                    <div className="text-muted text-xs">{entry.characterNames}</div>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell className="text-muted-strong">{entry.role}</Table.Cell>
              <Table.Cell className="text-muted-strong">{entry.encounters}</Table.Cell>
              <Table.Cell className="text-muted-strong">{entry.kills}</Table.Cell>
              <Table.Cell className="text-muted-strong">{entry.avgDps}</Table.Cell>
              <Table.Cell className="text-muted-strong">{entry.avgDowns}</Table.Cell>
              <Table.Cell className="text-muted text-sm">
                {entry.lastActive.toLocaleDateString("de-DE")}
              </Table.Cell>
            </Table.Row>
          ))}
          {roster.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={7} className="text-muted">
                Noch keine ausgewerteten Logs.
              </Table.Cell>
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
