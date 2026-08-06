import { LogFileStatus, prisma } from "@voidlog/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

const STATUS_LABEL: Record<LogFileStatus, string> = {
  [LogFileStatus.PENDING]: "Pending",
  [LogFileStatus.PARSING]: "Parsing…",
  [LogFileStatus.DONE]: "Done",
  [LogFileStatus.FAILED]: "Failed",
};

export default async function BatchDetailPage(
  props: PageProps<"/projects/[projectId]/batches/[batchId]">,
) {
  const { projectId, batchId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
    include: {
      logFiles: {
        include: { encounterResult: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!batch || batch.projectId !== projectId) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-muted hover:text-foreground text-sm">
        ← {membership.project.name}
      </Link>
      <h1 className="mt-1 text-xl font-semibold">{batch.label}</h1>

      <ul className="divide-line border-line mt-6 divide-y rounded-md border">
        {batch.logFiles.map((logFile, i) => (
          <li key={logFile.id} className="px-4 py-3">
            {logFile.status === LogFileStatus.DONE && logFile.encounterResult ? (
              <Link
                href={`/projects/${projectId}/batches/${batchId}/logs/${logFile.id}`}
                className="flex items-center justify-between hover:underline"
              >
                <span>
                  Attempt {i + 1} · {logFile.encounterResult.bossName}
                </span>
                <span className={logFile.encounterResult.success ? "text-success" : "text-danger"}>
                  {logFile.encounterResult.success ? "Success" : "Wipe"} ·{" "}
                  {Math.round(logFile.encounterResult.durationMs / 1000)}s
                </span>
              </Link>
            ) : (
              <div className="flex items-center justify-between">
                <span>Attempt {i + 1}</span>
                <span
                  className={logFile.status === LogFileStatus.FAILED ? "text-danger" : "text-muted"}
                >
                  {STATUS_LABEL[logFile.status]}
                </span>
              </div>
            )}
            {logFile.status === LogFileStatus.FAILED && logFile.errorMessage ? (
              <p className="text-danger mt-1 text-sm">{logFile.errorMessage}</p>
            ) : null}
          </li>
        ))}
        {batch.logFiles.length === 0 ? (
          <li className="text-muted px-4 py-3">No log files in this batch.</li>
        ) : null}
      </ul>
    </main>
  );
}
