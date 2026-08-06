import Link from "next/link";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { BatchUploadForm } from "./batch-upload-form";

export default async function NewBatchPage(props: PageProps<"/projects/[projectId]/batches/new">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  const membership = await requireProjectMembership(projectId, session.user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-muted hover:text-foreground text-sm">
        ← {membership.project.name}
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Upload batch</h1>
      <p className="text-muted mt-1 text-sm">
        Select .evtc/.zevtc files. Each uploads directly to storage (ADR-003), then parsing starts
        automatically and progress streams live below.
      </p>

      <BatchUploadForm projectId={projectId} />
    </main>
  );
}
