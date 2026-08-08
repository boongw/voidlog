"use client";

import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveLogButton({ logFileId }: { logFileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    if (!window.confirm("Fehlgeschlagenen Log-Upload entfernen?")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/log-files/${logFileId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Konnte Log nicht entfernen (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="1"
        variant="soft"
        color="red"
        onClick={handleRemove}
        disabled={pending}
      >
        {pending ? "Wird entfernt…" : "Entfernen"}
      </Button>
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  );
}
