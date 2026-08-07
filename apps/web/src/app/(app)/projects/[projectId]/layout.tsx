import { prisma } from "@voidlog/db";
import { Sidebar } from "@/components/sidebar";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function ProjectLayout(props: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const latestBatch = await prisma.uploadBatch.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={session.user.name ?? "Account"}
        currentProject={{ id: projectId, name: membership.project.name, latestBatch }}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{props.children}</div>
    </div>
  );
}
