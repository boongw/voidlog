"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface CreateBatchResponse {
  batchId: string;
  files: { logFileId: string; storageKey: string; uploadUrl: string }[];
}

interface LogFileSnapshot {
  id: string;
  status: "PENDING" | "PARSING" | "DONE" | "FAILED";
  errorMessage: string | null;
}

interface BatchSnapshot {
  total: number;
  done: number;
  failed: number;
  files: LogFileSnapshot[];
}

type Phase = "idle" | "uploading" | "processing" | "complete" | "error";

export function BatchUploadForm({ projectId }: { projectId: string }) {
  const [label, setLabel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<BatchSnapshot | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setError(null);
    setPhase("uploading");

    try {
      const createResponse = await fetch(`/api/projects/${projectId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || `Batch ${new Date().toLocaleString()}`,
          files: files.map((f) => ({ fileName: f.name })),
        }),
      });
      if (!createResponse.ok) {
        throw new Error(`Could not create batch (${createResponse.status})`);
      }
      const created = (await createResponse.json()) as CreateBatchResponse;
      setBatchId(created.batchId);

      // Direct-to-storage upload (ADR-003) — files never pass through our server.
      await Promise.all(
        created.files.map((entry, i) =>
          fetch(entry.uploadUrl, {
            method: "PUT",
            body: files[i],
            headers: { "Content-Type": "application/octet-stream" },
          }).then((res) => {
            if (!res.ok) throw new Error(`Upload failed for ${files[i]?.name} (${res.status})`);
          }),
        ),
      );

      setPhase("processing");

      const enqueueResponse = await fetch(`/api/batches/${created.batchId}/enqueue`, {
        method: "POST",
      });
      if (!enqueueResponse.ok) {
        throw new Error(`Could not start processing (${enqueueResponse.status})`);
      }

      const source = new EventSource(`/api/batches/${created.batchId}/events`);
      eventSourceRef.current = source;
      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as BatchSnapshot | { event: "complete" };
        if ("event" in payload) {
          setPhase("complete");
          source.close();
          return;
        }
        setSnapshot(payload);
      };
      source.onerror = () => {
        source.close();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Batch label (e.g. Raid night 2026-08-06)"
          disabled={phase !== "idle"}
          className="border-line rounded-md border px-3 py-2"
        />
        <input
          type="file"
          multiple
          accept=".evtc,.zevtc"
          disabled={phase !== "idle"}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="border-line rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={files.length === 0 || phase !== "idle"}
          className="bg-primary text-primary-foreground self-start rounded-md px-4 py-2 disabled:opacity-50"
        >
          {phase === "idle" ? `Upload ${files.length || ""} file(s)` : "Working…"}
        </button>
      </form>

      {error ? <p className="text-danger mt-4">{error}</p> : null}

      {phase === "uploading" ? <p className="text-muted mt-4">Uploading to storage…</p> : null}

      {phase === "processing" || phase === "complete" ? (
        <div className="mt-6">
          <h2 className="font-medium">Progress</h2>
          {snapshot ? (
            <>
              <p className="text-muted mt-1 text-sm">
                {snapshot.done + snapshot.failed}/{snapshot.total} finished
                {snapshot.failed > 0 ? ` (${snapshot.failed} failed)` : ""}
              </p>
              <ul className="divide-line border-line mt-2 divide-y rounded-md border">
                {snapshot.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-mono">{f.id}</span>
                    <span className={f.status === "FAILED" ? "text-danger" : "text-muted"}>
                      {f.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted mt-1 text-sm">Waiting for worker…</p>
          )}
        </div>
      ) : null}

      {phase === "complete" && batchId ? (
        <Link
          href={`/projects/${projectId}/batches/${batchId}`}
          className="bg-primary text-primary-foreground mt-6 inline-block rounded-md px-4 py-2"
        >
          View batch
        </Link>
      ) : null}
    </div>
  );
}
