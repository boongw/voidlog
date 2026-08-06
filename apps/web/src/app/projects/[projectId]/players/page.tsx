import { prisma } from "@voidlog/db";
import Link from "next/link";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

interface RosterEntry {
  account: string;
  characterNames: Set<string>;
  encounters: number;
  totalDps: number;
}

export default async function RosterPage(props: PageProps<"/projects/[projectId]/players">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const playerResults = await prisma.playerResult.findMany({
    where: { encounterResult: { logFile: { batch: { projectId } } } },
    select: { account: true, characterName: true, dps: true },
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
    };
    entry.characterNames.add(p.characterName);
    entry.encounters += 1;
    entry.totalDps += p.dps;
    byAccount.set(p.account, entry);
  }
  const roster = [...byAccount.values()].sort((a, b) => b.encounters - a.encounters);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-muted hover:text-foreground text-sm">
        ← {membership.project.name}
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Roster</h1>

      <div className="border-line mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-line text-muted border-b">
            <tr>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Characters</th>
              <th className="px-4 py-2 font-medium">Encounters</th>
              <th className="px-4 py-2 font-medium">Avg DPS</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {roster.map((entry) => (
              <tr key={entry.account}>
                <td className="px-4 py-2">{entry.account}</td>
                <td className="text-muted px-4 py-2">{[...entry.characterNames].join(", ")}</td>
                <td className="px-4 py-2">{entry.encounters}</td>
                <td className="px-4 py-2">{Math.round(entry.totalDps / entry.encounters)}</td>
              </tr>
            ))}
            {roster.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-3">
                  No parsed logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
