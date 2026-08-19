"use client";

import { Table } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { SortableColumnHeader } from "@/components/sortable-column-header";

export interface RosterRow {
  account: string;
  characterNames: string;
  role: string;
  encounters: number;
  kills: number;
  avgDps: number;
  avgDowns: string;
  shockwaveHits: number;
  shockwaveHitsPerEncounter: string;
  debilitatedHits: number;
  debilitatedHitsPerEncounter: string;
  revealCount: number;
  revealCountPerEncounter: string;
  lastActive: Date;
}

type SortKey =
  | "account"
  | "role"
  | "encounters"
  | "kills"
  | "avgDps"
  | "avgDowns"
  | "shockwaveHits"
  | "debilitatedHits"
  | "revealCount"
  | "lastActive";

// Text/date columns read more naturally starting ascending (A→Z, oldest
// first); numeric performance stats are more useful starting descending
// (highest first) — matches the table's original default sort (most
// encounters first).
const DEFAULT_DIRECTION: Record<SortKey, "asc" | "desc"> = {
  account: "asc",
  role: "asc",
  encounters: "desc",
  kills: "desc",
  avgDps: "desc",
  avgDowns: "desc",
  shockwaveHits: "desc",
  debilitatedHits: "desc",
  revealCount: "desc",
  lastActive: "desc",
};

function compareRows(a: RosterRow, b: RosterRow, key: SortKey): number {
  switch (key) {
    case "account":
      return a.account.localeCompare(b.account);
    case "role":
      return a.role.localeCompare(b.role);
    case "encounters":
      return a.encounters - b.encounters;
    case "kills":
      return a.kills - b.kills;
    case "avgDps":
      return a.avgDps - b.avgDps;
    case "avgDowns":
      return Number.parseFloat(a.avgDowns) - Number.parseFloat(b.avgDowns);
    case "shockwaveHits":
      return a.shockwaveHits - b.shockwaveHits;
    case "debilitatedHits":
      return a.debilitatedHits - b.debilitatedHits;
    case "revealCount":
      return a.revealCount - b.revealCount;
    case "lastActive":
      return a.lastActive.getTime() - b.lastActive.getTime();
  }
}

export function RosterTable({ roster }: Readonly<{ roster: RosterRow[] }>) {
  const [sortKey, setSortKey] = useState<SortKey>("encounters");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(DEFAULT_DIRECTION[key]);
    }
  }

  const sorted = useMemo(() => {
    const rows = [...roster].sort((a, b) => compareRows(a, b, sortKey));
    return direction === "asc" ? rows : rows.reverse();
  }, [roster, sortKey, direction]);

  function header(key: SortKey, label: string) {
    return (
      <SortableColumnHeader
        active={sortKey === key}
        direction={direction}
        onClick={() => handleSort(key)}
      >
        {label}
      </SortableColumnHeader>
    );
  }

  return (
    <Table.Root variant="surface" className="border-line bg-surface border">
      <Table.Header>
        <Table.Row>
          {header("account", "Spieler")}
          {header("role", "Rolle")}
          {header("encounters", "Teilnahmen")}
          {header("kills", "Kills")}
          {header("avgDps", "Ø DPS")}
          {header("avgDowns", "Ø Downs")}
          {header("shockwaveHits", "Schockwellen getroffen")}
          {header("debilitatedHits", "Geschwächt erhalten")}
          {header("revealCount", "Zu früh aufgedeckt")}
          {header("lastActive", "Zuletzt aktiv")}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted.map((entry) => (
          <Table.Row key={entry.account}>
            <Table.Cell>
              <div className="flex items-center gap-2.5">
                <span className="bg-line h-[22px] w-[22px] shrink-0 rounded-full" />
                <div>
                  <div className="text-foreground font-semibold">{entry.account}</div>
                  <div className="text-muted text-xs">{entry.characterNames}</div>
                </div>
              </div>
            </Table.Cell>
            <Table.Cell className="text-muted-strong">{entry.role}</Table.Cell>
            <Table.Cell className="text-muted-strong">{entry.encounters}</Table.Cell>
            <Table.Cell className="text-muted-strong">{entry.kills}</Table.Cell>
            <Table.Cell className="text-muted-strong">{entry.avgDps}</Table.Cell>
            <Table.Cell className="text-muted-strong">{entry.avgDowns}</Table.Cell>
            <Table.Cell className="text-warning font-semibold">
              {entry.shockwaveHits}{" "}
              <span className="text-muted text-sm font-medium">
                (Ø {entry.shockwaveHitsPerEncounter})
              </span>
            </Table.Cell>
            <Table.Cell className="text-warning font-semibold">
              {entry.debilitatedHits}{" "}
              <span className="text-muted text-sm font-medium">
                (Ø {entry.debilitatedHitsPerEncounter})
              </span>
            </Table.Cell>
            <Table.Cell className="text-warning font-semibold">
              {entry.revealCount}{" "}
              <span className="text-muted text-sm font-medium">
                (Ø {entry.revealCountPerEncounter})
              </span>
            </Table.Cell>
            <Table.Cell className="text-muted text-sm">
              {entry.lastActive.toLocaleDateString("de-DE")}
            </Table.Cell>
          </Table.Row>
        ))}
        {sorted.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={10} className="text-muted">
              Noch keine ausgewerteten Logs.
            </Table.Cell>
          </Table.Row>
        ) : null}
      </Table.Body>
    </Table.Root>
  );
}
