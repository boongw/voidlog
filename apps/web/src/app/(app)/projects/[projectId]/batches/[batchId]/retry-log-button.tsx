"use client";

import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryLogButton({ logFileId }: { logFileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/log-files/${logFileId}/retry`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Could not retry (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="1" variant="soft" onClick={handleRetry} disabled={pending}>
        {pending ? "Wird neu eingereiht…" : "Reload"}
      </Button>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}
