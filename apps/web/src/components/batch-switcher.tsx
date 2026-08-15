"use client";

import { Select } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export interface BatchOption {
  id: string;
  label: string;
}

export function BatchSwitcher({
  projectId,
  batches,
  currentBatchId,
}: {
  projectId: string;
  batches: BatchOption[];
  currentBatchId: string;
}) {
  const router = useRouter();

  function handleChange(nextBatchId: string) {
    if (nextBatchId === currentBatchId) return;
    // Always land on the batch's base page — sub-routes like a specific
    // log file's detail page don't exist for a different batch, and the
    // roster is a tab on the base page now, not its own route.
    router.push(`/projects/${projectId}/batches/${nextBatchId}`);
  }

  return (
    <Select.Root value={currentBatchId} onValueChange={handleChange}>
      <Select.Trigger variant="surface" className="min-w-[180px]" />
      <Select.Content>
        {batches.map((batch) => (
          <Select.Item key={batch.id} value={batch.id}>
            {batch.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
