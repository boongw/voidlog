"use client";

import { ChevronRightIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Card, Tabs, Table } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";
import { PhaseBadge, phaseColor } from "@/components/phase-badge";

export interface AttemptRow {
  logFileId: string;
  n: number;
  success: boolean;
  furthestPhase: { name: string; order: number } | null;
  durationMs: number;
  segments: { name: string; order: number; leftPct: number; widthPct: number }[];
  deaths: { timeMs: number; player: string | null }[];
  mechanics: { timeMs: number; name: string }[];
  phases: {
    name: string;
    order: number;
    reached: boolean;
    success: boolean;
    mechanics: { name: string; player: string | null }[];
  }[];
}

export interface BatchPhaseStat {
  name: string;
  order: number;
  reached: number;
  total: number;
  mechanics: { displayName: string; count: number }[];
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function BatchAttempts({
  projectId,
  batchId,
  attempts,
  batchPhaseStats,
}: {
  projectId: string;
  batchId: string;
  attempts: AttemptRow[];
  batchPhaseStats: BatchPhaseStat[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const maxDurationMs = Math.max(1, ...attempts.map((a) => a.durationMs));

  return (
    <Tabs.Root defaultValue="table">
      <Tabs.List>
        <Tabs.Trigger value="table">Tabelle</Tabs.Trigger>
        <Tabs.Trigger value="timeline">Zeitstrahl</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="table" className="mt-4">
        <Table.Root variant="surface" className="border-line bg-surface border">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Ergebnis</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Weiteste Phase</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Dauer</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {attempts.map((a) => (
              <Table.Row key={a.logFileId}>
                <Table.Cell className="text-muted">{a.n}</Table.Cell>
                <Table.Cell
                  className={a.success ? "text-success font-semibold" : "text-danger font-semibold"}
                >
                  {a.success ? "Kill" : "Wipe"}
                </Table.Cell>
                <Table.Cell>
                  {a.furthestPhase ? (
                    <PhaseBadge name={a.furthestPhase.name} order={a.furthestPhase.order} />
                  ) : (
                    "—"
                  )}
                </Table.Cell>
                <Table.Cell className="text-muted-strong">
                  {formatDuration(a.durationMs)}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Link
                    href={`/projects/${projectId}/batches/${batchId}/logs/${a.logFileId}`}
                    className="text-accent text-sm hover:underline"
                  >
                    Log ansehen →
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
            {attempts.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-muted">
                  Noch keine ausgewerteten Versuche.
                </Table.Cell>
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table.Root>
      </Tabs.Content>

      <Tabs.Content value="timeline" className="mt-4">
        <p className="text-muted mb-3.5 text-xs">
          Aggregiert über alle {attempts.length} Versuche des Batches
        </p>
        <div className="mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {batchPhaseStats.map((bp) => {
            const color = phaseColor(bp.order, bp.name);
            const reachedPct = bp.total > 0 ? Math.round((bp.reached / bp.total) * 100) : 0;
            return (
              <Card
                key={bp.name}
                size="2"
                className="border-line bg-surface border"
                style={{ borderTop: `3px solid ${color}` }}
              >
                <div className="font-heading mb-2 text-sm font-bold" style={{ color }}>
                  {bp.name}
                </div>
                <div className="text-muted-strong mb-1 text-xs">
                  {bp.reached} / {bp.total} erreicht
                </div>
                <div className="bg-line-soft mb-3 h-1 overflow-hidden rounded-full">
                  <div className="h-full" style={{ width: `${reachedPct}%`, background: color }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  {bp.mechanics.map((m) => (
                    <div key={m.displayName} className="bg-line-soft/40 rounded-sm px-2 py-1.5">
                      <div className="text-muted-strong text-xs">{m.displayName}</div>
                      <div className="text-danger text-xs font-bold">{m.count}x verfehlt</div>
                    </div>
                  ))}
                  {bp.mechanics.length === 0 ? (
                    <div className="text-muted text-xs">Keine Mechanik-Fehler erfasst.</div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-muted-strong mb-2.5 text-sm font-semibold">Versuchsverlauf</div>
        <div className="border-line bg-surface divide-line-soft flex flex-col divide-y rounded-sm border">
          {attempts.map((a) => {
            const isOpen = expanded === a.n;
            return (
              <div key={a.logFileId}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : a.n)}
                  className="grid w-full grid-cols-[16px_28px_48px_1fr_48px] items-center gap-3.5 px-4 py-2.5 text-left"
                >
                  <ChevronRightIcon
                    className="text-muted h-4 w-4 transition-transform"
                    style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                  />
                  <span className="text-muted text-xs">{a.n}</span>
                  <span
                    className={
                      a.success
                        ? "text-success text-xs font-semibold"
                        : "text-danger text-xs font-semibold"
                    }
                  >
                    {a.success ? "Kill" : "Wipe"}
                  </span>
                  <span
                    className="flex flex-col gap-1 justify-self-start"
                    style={{ width: `${Math.max((a.durationMs / maxDurationMs) * 100, 4)}%` }}
                  >
                    <span className="bg-line-soft relative h-2 w-full rounded-sm">
                      {a.segments.map((seg) => (
                        <span
                          key={seg.order}
                          title={seg.name}
                          className="absolute top-0 h-2 rounded-[1px]"
                          style={{
                            left: `${seg.leftPct}%`,
                            width: `${seg.widthPct}%`,
                            background: phaseColor(seg.order, seg.name),
                          }}
                        />
                      ))}
                    </span>
                    <span className="relative h-3 w-full">
                      {a.deaths.map((d, i) => (
                        <span
                          key={`death-${i}`}
                          title={`Tod${d.player ? ` — ${d.player}` : ""}`}
                          className="absolute top-0 -translate-x-1/2"
                          style={{ left: `${(d.timeMs / a.durationMs) * 100}%` }}
                        >
                          <Cross2Icon className="text-danger h-3 w-3" />
                        </span>
                      ))}
                      {a.mechanics.map((m, i) => (
                        <span
                          key={`mech-${i}`}
                          title={m.name}
                          className="absolute top-0 -translate-x-1/2"
                          style={{ left: `${(m.timeMs / a.durationMs) * 100}%` }}
                        >
                          <ExclamationTriangleIcon className="text-warning h-3 w-3" />
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="text-muted-strong text-right text-xs">
                    {formatDuration(a.durationMs)}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-line-soft border-t px-4 py-3.5 pl-[62px]">
                    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                      {a.phases.map((phase) => (
                        <div
                          key={phase.order}
                          className="bg-surface-2 border-line border-l-3 rounded-sm border-y border-r px-2.5 py-2"
                          style={{ borderLeftColor: phaseColor(phase.order, phase.name) }}
                        >
                          <div className="text-muted mb-1 text-[10px] uppercase">{phase.name}</div>
                          <div className="text-foreground text-xs font-semibold">
                            {phase.reached
                              ? phase.success
                                ? "Abgeschlossen"
                                : "Nicht abgeschlossen"
                              : "Nicht erreicht"}
                          </div>
                          {phase.mechanics.length > 0 ? (
                            <div className="text-muted-strong mt-1 text-[10.5px]">
                              {phase.mechanics
                                .map((m) => m.name + (m.player ? ` (${m.player})` : ""))
                                .join(", ")}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/projects/${projectId}/batches/${batchId}/logs/${a.logFileId}`}
                      className="text-accent mt-3 inline-block text-xs hover:underline"
                    >
                      Vollständigen Log ansehen →
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
          {attempts.length === 0 ? (
            <div className="text-muted px-4 py-3 text-sm">Noch keine ausgewerteten Versuche.</div>
          ) : null}
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
