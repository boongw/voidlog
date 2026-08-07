import { LogFileStatus, ProjectRole, prisma } from "@voidlog/db";
import Link from "next/link";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { DeleteProjectButton } from "./delete-project-button";

export default async function ProjectDetailPage(props: PageProps<"/projects/[projectId]">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const batches = await prisma.uploadBatch.findMany({
    where: { projectId },
    include: { logFiles: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-muted hover:text-foreground text-sm">
            ← Projects
          </Link>
          <h1 className="text-xl font-semibold">{membership.project.name}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/projects/${projectId}/players`}
            className="border-line rounded-md border px-3 py-2 text-sm"
          >
            Roster
          </Link>
          <Link
            href={`/projects/${projectId}/batches/new`}
            className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm"
          >
            Upload batch
          </Link>
          {membership.role === ProjectRole.OWNER ? (
            <DeleteProjectButton projectId={projectId} projectName={membership.project.name} />
          ) : null}
        </div>
      </div>

      <ul className="divide-line border-line mt-6 divide-y rounded-md border">
        {batches.map((batch) => {
          const total = batch.logFiles.length;
          const done = batch.logFiles.filter((f) => f.status === LogFileStatus.DONE).length;
          const failed = batch.logFiles.filter((f) => f.status === LogFileStatus.FAILED).length;
          return (
            <li key={batch.id}>
              <Link
                href={`/projects/${projectId}/batches/${batch.id}`}
                className="hover:bg-surface flex items-center justify-between px-4 py-3"
              >
                <span>{batch.label}</span>
                <span className="text-muted text-sm">
                  {done}/{total} done{failed > 0 ? `, ${failed} failed` : ""}
                </span>
              </Link>
            </li>
          );
        })}
        {batches.length === 0 ? <li className="text-muted px-4 py-3">No batches yet.</li> : null}
      </ul>
    </main>
  );
}
