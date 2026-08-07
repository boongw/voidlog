"use client";

import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteBatchButton({
  projectId,
  batchId,
  batchLabel,
}: {
  projectId: string;
  batchId: string;
  batchLabel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete batch "${batchLabel}"? This permanently removes its logs and results.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Could not delete batch (${response.status})`);
      }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" color="red" variant="soft" onClick={handleDelete} disabled={pending}>
        {pending ? "Wird gelöscht…" : "Batch löschen"}
      </Button>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
    </div>
  );
}
