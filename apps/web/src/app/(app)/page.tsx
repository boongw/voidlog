import { ProjectRole, prisma } from "@voidlog/db";
import { Card } from "@radix-ui/themes";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { PhaseBadge } from "@/components/phase-badge";
import { Sidebar } from "@/components/sidebar";
import { isMainPhase } from "@/lib/main-phases";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      uploadBatches: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          logFiles: {
            select: {
              encounterResult: {
                select: {
                  bossId: true,
                  success: true,
                  phaseResults: { select: { name: true, order: true, reached: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaries = projects.map((project) => {
    const encounters = project.uploadBatches
      .flatMap((b) => b.logFiles)
      .map((f) => f.encounterResult)
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const successRate =
      encounters.length > 0
        ? Math.round((encounters.filter((e) => e.success).length / encounters.length) * 100)
        : null;

    let furthestPhase: { name: string; order: number } | null = null;
    for (const encounter of encounters) {
      for (const phase of encounter.phaseResults) {
        if (
          phase.reached &&
          isMainPhase(encounter.bossId, phase.name) &&
          (!furthestPhase || phase.order > furthestPhase.order)
        ) {
          furthestPhase = phase;
        }
      }
    }

    return {
      id: project.id,
      name: project.name,
      lastBatchAt: project.uploadBatches[0]?.createdAt ?? null,
      successRate,
      furthestPhase,
    };
  });

  async function createProject(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const currentSession = await requireSession();
    const project = await prisma.project.create({
      data: {
        name,
        ownerId: currentSession.user.id,
        members: { create: { userId: currentSession.user.id, role: ProjectRole.OWNER } },
      },
    });
    redirect(`/projects/${project.id}`);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.user.name ?? "Account"} />
      <div className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-heading text-foreground-strong text-2xl font-bold">Projekte</h1>
            <p className="text-muted mt-1 text-sm">Trainingsgruppen im Überblick</p>
          </div>
          <CreateProjectDialog action={createProject} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="min-w-0">
              <Card size="3" className="border-line bg-surface h-full border">
                <div className="font-heading text-foreground truncate text-base font-semibold">
                  {p.name}
                </div>
                <div className="text-muted mb-4 text-xs">
                  Letzter Upload: {p.lastBatchAt ? p.lastBatchAt.toLocaleDateString("de-DE") : "—"}
                </div>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <div className="text-muted mb-1 text-[11px] font-medium uppercase tracking-wide">
                      Erfolgsquote
                    </div>
                    <div className="font-heading text-warning text-xl font-bold">
                      {p.successRate === null ? "—" : `${p.successRate}%`}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted mb-1 text-[11px] font-medium uppercase tracking-wide">
                      Weiteste Phase
                    </div>
                    {p.furthestPhase ? (
                      <PhaseBadge name={p.furthestPhase.name} order={p.furthestPhase.order} />
                    ) : (
                      <span className="text-muted text-sm">—</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {summaries.length === 0 ? (
            <p className="text-muted col-span-full">Noch keine Projekte — leg oben eins an.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
