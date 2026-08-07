import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { BatchUploadForm } from "./batch-upload-form";

export default async function NewBatchPage(props: PageProps<"/projects/[projectId]/batches/new">) {
  const { projectId } = await props.params;
  const session = await requireSession();
  await requireProjectMembership(projectId, session.user.id);

  return (
    <div className="max-w-2xl px-10 py-8">
      <h1 className="font-heading text-foreground-strong text-2xl font-bold">Logs hochladen</h1>
      <p className="text-muted mt-1 text-sm">
        .evtc/.zevtc-Dateien auswählen. Jede Datei geht direkt an den Storage (ADR-003), danach
        startet die Verarbeitung automatisch und der Fortschritt wird live unten angezeigt.
      </p>

      <BatchUploadForm projectId={projectId} />
    </div>
  );
}
