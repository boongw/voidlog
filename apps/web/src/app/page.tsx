import { ProjectRole, prisma } from "@voidlog/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id },
    include: { project: { include: { _count: { select: { uploadBatches: true } } } } },
    orderBy: { project: { createdAt: "desc" } },
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Projects</h1>

      <ul className="divide-line border-line mt-4 divide-y rounded-md border">
        {memberships.map(({ project, role }) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="hover:bg-surface flex items-center justify-between px-4 py-3"
            >
              <span>{project.name}</span>
              <span className="text-muted text-sm">
                {role.toLowerCase()} · {project._count.uploadBatches} batches
              </span>
            </Link>
          </li>
        ))}
        {memberships.length === 0 ? (
          <li className="text-muted px-4 py-3">No projects yet — create one below.</li>
        ) : null}
      </ul>

      <form action={createProject} className="mt-6 flex gap-2">
        <input
          name="name"
          placeholder="New project name"
          required
          className="border-line flex-1 rounded-md border px-3 py-2"
        />
        <button type="submit" className="bg-primary text-primary-foreground rounded-md px-4 py-2">
          Create
        </button>
      </form>
    </main>
  );
}
