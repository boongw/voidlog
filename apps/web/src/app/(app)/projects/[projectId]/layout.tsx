import { Sidebar } from "@/components/sidebar";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function ProjectLayout(props: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={session.user.name ?? "Account"}
        currentProject={{ id: projectId, name: membership.project.name }}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{props.children}</div>
    </div>
  );
}
