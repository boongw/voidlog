"use client";

import { ChevronRightIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Card, Tabs, Table } from "@radix-ui/themes";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { PhaseBadge, phaseColor } from "@/components/phase-badge";
import { isVisibleCastMarker } from "@/lib/mechanics";
import { RemoveLogButton } from "./remove-log-button";

export interface AttemptRow {
  logFileId: string;
  bossId: string;
  isCM: boolean;
  n: number;
  success: boolean;
  furthestPhase: { name: string; order: number } | null;
  durationMs: number;
  segments: { name: string; order: number; leftPct: number; widthPct: number }[];
  deaths: { timeMs: number; player: string | null }[];
  mechanics: { timeMs: number; name: string; mechanicName: string }[];
  phases: {
    name: string;
    order: number;
    reached: boolean;
    success: boolean;
    mechanics: { mechanicName: string; name: string; player: string | null }[];
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

// Normal Mode and Challenge Mode share the same bossId (see EncounterResult
// .isCM) — this is the only visual signal that an attempt was accidentally
// uploaded in the wrong mode.
function ModeBadge({ isCM }: { isCM: boolean }) {
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
        isCM ? "bg-primary/15 text-primary" : "bg-line-soft text-muted-strong"
      }`}
    >
      {isCM ? "CM" : "NM"}
    </span>
  );
}

type AttackType = "jaws" | "slam" | "beam" | "shockwave" | "scream" | "green";

// The glyphs below (attackType/ATTACK_LABEL too) are inherently specific
// to Harvest Temple CM's curated cast markers (see cast-markers.ts on the
// worker) — pending a boss-pluggable icon system, this component only
// draws them for that one boss, so the color lookup is hardcoded to it
// rather than threaded through as a prop.
const HARVEST_TEMPLE_BOSS_ID = "43488";

// The Greens hazard spawns across three different dragons (Jormag/Primordus/
// Zhaitan), so it can't reuse one dragon's phase color the way the other
// glyphs do — it gets its own fixed, mechanic-appropriate green instead.
const GREEN_SPAWN_COLOR = "#4CA64C";

const ATTACK_COLOR: Record<AttackType, string> = {
  jaws: phaseColor(HARVEST_TEMPLE_BOSS_ID, 0, "Primordus"),
  slam: phaseColor(HARVEST_TEMPLE_BOSS_ID, 0, "Primordus"),
  beam: phaseColor(HARVEST_TEMPLE_BOSS_ID, 0, "Kralkatorrik"),
  shockwave: phaseColor(HARVEST_TEMPLE_BOSS_ID, 0, "Mordremoth"),
  scream: phaseColor(HARVEST_TEMPLE_BOSS_ID, 0, "Zhaitan"),
  green: GREEN_SPAWN_COLOR,
};

// One small glyph per boss attack, drawn in the dragon's own color — sits
// in its own lane above the phase bar so it reads as "the boss did this",
// distinct in both position and color from the fail/death lane below.
function AttackGlyph({ type, flipped }: { type: AttackType; flipped?: boolean }) {
  const color = ATTACK_COLOR[type];
  if (type === "jaws") {
    return (
      <svg viewBox="0 0 12 12" width="13" height="13" className="opacity-70">
        <path
          d="M1 3 L6 6 L1 9"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 3 L6 6 L11 9"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "slam") {
    return (
      <svg viewBox="0 0 12 12" width="13" height="13" className="opacity-70">
        <rect x="2.5" y="2.5" width="7" height="7" fill={color} transform="rotate(45 6 6)" />
      </svg>
    );
  }
  if (type === "beam") {
    return (
      <svg
        viewBox="0 0 12 12"
        width="13"
        height="13"
        className="opacity-70"
        style={{ transform: flipped ? "scaleX(-1)" : undefined }}
      >
        <path
          d="M3 2 L8 6 L3 10"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "shockwave") {
    return (
      <svg viewBox="0 0 12 12" width="13" height="13" className="opacity-70">
        <circle cx="6" cy="6" r="2" fill={color} />
        <circle cx="6" cy="6" r="4.6" fill="none" stroke={color} strokeWidth="1.3" opacity="0.55" />
      </svg>
    );
  }
  if (type === "scream") {
    return (
      <svg viewBox="0 0 12 12" width="13" height="13" className="opacity-70">
        <path
          d="M1 6 Q3 2 5 6 T9 6 T13 6"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // "green": three small circles — the Greens hazard always spawns as
  // multiple simultaneous stack points, unlike the other single-target casts.
  return (
    <svg viewBox="0 0 12 12" width="13" height="13" className="opacity-70">
      <circle cx="3" cy="8.5" r="1.6" fill={color} />
      <circle cx="6" cy="3.5" r="1.6" fill={color} />
      <circle cx="9" cy="8.5" r="1.6" fill={color} />
    </svg>
  );
}

const ATTACK_LABEL: Record<AttackType, string> = {
  jaws: "Jaws of Destruction",
  slam: "Lava Slam",
  beam: "Branding Beam",
  shockwave: "Mordremoth Shockwave",
  scream: "Zhaitans Schrei",
  green: "Grünkreise (aufgelöst)",
};

// Maps a synthetic "*.Cast"/"*.Spawn" mechanicName to its attack glyph type
// — the single place that connects worker-side cast-markers.ts to the icon
// above.
function attackType(mechanicName: string): AttackType | null {
  if (mechanicName === "Jaws.Cast") return "jaws";
  if (mechanicName === "Slam.Cast") return "slam";
  if (mechanicName === "Beam.Cast") return "beam";
  if (mechanicName === "ShckWv.Cast") return "shockwave";
  if (mechanicName === "Scream.Cast") return "scream";
  if (mechanicName === "Green.Spawn") return "green";
  return null;
}

interface PhaseFilterGroup {
  name: string;
  order: number;
  attacks: [string, AttackType][];
  fails: [string, string][];
}

// Mechanics that can happen in any phase (not tied to boss mechanics) — kept
// out of the per-phase groups so they don't get listed once per phase, and
// shown once under "Weitere" instead.
const GLOBAL_MECHANIC_LABELS: Record<string, string> = {
  Downed: "Downstate",
  DC: "Disconnect",
};

// One toggle chip for a single mechanic — clicking it hides that mechanic's
// markers from every attempt row below (keyed by the raw mechanicName, so it
// works for any boss, not just the hardcoded HTCM attack glyphs).
function MechanicToggle({
  mechanicName,
  label,
  icon,
  isHidden,
  onToggle,
}: {
  mechanicName: string;
  label: string;
  icon: ReactNode;
  isHidden: boolean;
  onToggle: (mechanicName: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(mechanicName)}
      title={isHidden ? "Marker einblenden" : "Marker ausblenden"}
      className={`flex items-center gap-1.5 text-xs ${
        isHidden ? "text-muted opacity-45" : "text-muted-strong"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Collapsible, phase-grouped filter for the "Versuchsverlauf" timeline —
// collapsed by default since it's a secondary control, not something every
// visitor needs. Grouping by phase (instead of one flat list) mirrors the
// aggregate phase cards above it, so the same phase names/colors orient the
// user here too.
function failMechanicIcon(mechanicName: string) {
  if (mechanicName === "Downed") {
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size static icon, next/image is unnecessary overhead here
    return <img src="/icons/downed.png" alt="" className="h-4 w-2.5" />;
  }
  return <ExclamationTriangleIcon className="text-warning h-3.5 w-3.5" />;
}

function MechanicFilterAccordion({
  bossId,
  phaseGroups,
  multiPhaseAttacks,
  multiPhaseFails,
  otherEntries,
  hidden,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  bossId: string;
  phaseGroups: PhaseFilterGroup[];
  multiPhaseAttacks: [string, AttackType][];
  multiPhaseFails: [string, string][];
  otherEntries: [string, string][];
  hidden: Set<string>;
  onToggle: (mechanicName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  return (
    <details className="border-line-soft group mb-3.5 border-b pb-3.5">
      <summary className="text-muted-strong flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold select-none">
        <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Mechanik-Filter
      </summary>
      <div className="mt-3 hidden flex-col gap-3 group-open:flex">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDeselectAll();
            }}
            className="text-accent text-xs font-semibold hover:underline"
          >
            Alle einblenden
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSelectAll();
            }}
            className="text-accent text-xs font-semibold hover:underline"
          >
            Alle ausblenden
          </button>
        </div>
        {phaseGroups.map((group) => (
          <div key={group.name}>
            <div
              className="mb-1.5 text-[11px] font-semibold"
              style={{ color: phaseColor(bossId, group.order, group.name) }}
            >
              {group.name}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
              {group.attacks.map(([mechanicName, type]) => (
                <MechanicToggle
                  key={mechanicName}
                  mechanicName={mechanicName}
                  label={ATTACK_LABEL[type]}
                  icon={<AttackGlyph type={type} />}
                  isHidden={hidden.has(mechanicName)}
                  onToggle={onToggle}
                />
              ))}
              {group.fails.map(([mechanicName, label]) => (
                <MechanicToggle
                  key={mechanicName}
                  mechanicName={mechanicName}
                  label={label}
                  icon={failMechanicIcon(mechanicName)}
                  isHidden={hidden.has(mechanicName)}
                  onToggle={onToggle}
                />
              ))}
              {group.attacks.length === 0 && group.fails.length === 0 ? (
                <span className="text-muted text-xs">Keine Mechaniken erfasst.</span>
              ) : null}
            </div>
          </div>
        ))}
        {multiPhaseAttacks.length > 0 || multiPhaseFails.length > 0 ? (
          <div>
            <div className="text-muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
              Mehrere Phasen
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
              {multiPhaseAttacks.map(([mechanicName, type]) => (
                <MechanicToggle
                  key={mechanicName}
                  mechanicName={mechanicName}
                  label={ATTACK_LABEL[type]}
                  icon={<AttackGlyph type={type} />}
                  isHidden={hidden.has(mechanicName)}
                  onToggle={onToggle}
                />
              ))}
              {multiPhaseFails.map(([mechanicName, label]) => (
                <MechanicToggle
                  key={mechanicName}
                  mechanicName={mechanicName}
                  label={label}
                  icon={failMechanicIcon(mechanicName)}
                  isHidden={hidden.has(mechanicName)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <div className="text-muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
            Weitere
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <span className="text-muted-strong flex items-center gap-1.5 text-xs">
              <Cross2Icon className="text-danger h-3.5 w-3.5" />
              Tod
            </span>
            {otherEntries.map(([mechanicName, label]) => (
              <MechanicToggle
                key={mechanicName}
                mechanicName={mechanicName}
                label={label}
                icon={failMechanicIcon(mechanicName)}
                isHidden={hidden.has(mechanicName)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

export function BatchAttempts({
  projectId,
  batchId,
  bossId,
  attempts,
  batchPhaseStats,
}: {
  projectId: string;
  batchId: string;
  bossId: string;
  attempts: AttemptRow[];
  batchPhaseStats: BatchPhaseStat[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hiddenMechanics, setHiddenMechanics] = useState<Set<string>>(new Set());
  const maxDurationMs = Math.max(1, ...attempts.map((a) => a.durationMs));

  function toggleMechanic(mechanicName: string) {
    setHiddenMechanics((prev) => {
      const next = new Set(prev);
      if (next.has(mechanicName)) {
        next.delete(mechanicName);
      } else {
        next.add(mechanicName);
      }
      return next;
    });
  }

  // Every mechanicName that can show up anywhere in the filter accordion
  // (phase groups, "Mehrere Phasen", "Weitere") — all three sections are
  // built from this same underlying data, so collecting it once here covers
  // all of them for the select-all/deselect-all controls.
  const allFilterMechanicNames = useMemo(() => {
    const names = new Set<string>();
    for (const a of attempts) {
      for (const phase of a.phases) {
        for (const m of phase.mechanics) names.add(m.mechanicName);
      }
    }
    return names;
  }, [attempts]);

  function selectAllMechanics() {
    setHiddenMechanics(new Set(allFilterMechanicNames));
  }

  function deselectAllMechanics() {
    setHiddenMechanics(new Set());
  }

  // Distinct mechanics actually present per main phase, used to build the
  // phase-grouped filter accordion — boss-agnostic (attack glyphs only show
  // up if attackType() recognizes the mechanicName, which today means HTCM;
  // any other boss just gets fail-mechanic groups).
  const otherMechanicEntries = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) {
      for (const phase of a.phases) {
        for (const m of phase.mechanics) {
          const label = GLOBAL_MECHANIC_LABELS[m.mechanicName];
          if (label && !map.has(m.mechanicName)) map.set(m.mechanicName, label);
        }
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [attempts]);

  // Mechanics that show up in more than one main phase (e.g. a fail that can
  // happen throughout the fight, not tied to one phase) go into their own
  // "Mehrere Phasen" group instead of being listed once per phase.
  const { phaseFilterGroups, multiPhaseAttacks, multiPhaseFails } = useMemo(() => {
    const groups = new Map<
      string,
      { order: number; attacks: Map<string, AttackType>; fails: Map<string, string> }
    >();
    const phasesByMechanic = new Map<string, Set<string>>();
    const attackTypeByMechanic = new Map<string, AttackType>();
    const failLabelByMechanic = new Map<string, string>();

    for (const a of attempts) {
      for (const phase of a.phases) {
        const group = groups.get(phase.name) ?? {
          order: phase.order,
          attacks: new Map<string, AttackType>(),
          fails: new Map<string, string>(),
        };
        group.order = Math.min(group.order, phase.order);
        for (const m of phase.mechanics) {
          if (m.mechanicName in GLOBAL_MECHANIC_LABELS) continue;
          const type = attackType(m.mechanicName);
          if (type) {
            if (!group.attacks.has(m.mechanicName)) group.attacks.set(m.mechanicName, type);
            attackTypeByMechanic.set(m.mechanicName, type);
          } else {
            if (!group.fails.has(m.mechanicName)) group.fails.set(m.mechanicName, m.name);
            failLabelByMechanic.set(m.mechanicName, m.name);
          }
          const phases = phasesByMechanic.get(m.mechanicName) ?? new Set<string>();
          phases.add(phase.name);
          phasesByMechanic.set(m.mechanicName, phases);
        }
        groups.set(phase.name, group);
      }
    }

    const multiPhaseNames = new Set(
      [...phasesByMechanic.entries()].filter(([, phases]) => phases.size > 1).map(([name]) => name),
    );

    const phaseFilterGroups = [...groups.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, g]) => ({
        name,
        order: g.order,
        attacks: [...g.attacks.entries()].filter(([mn]) => !multiPhaseNames.has(mn)),
        fails: [...g.fails.entries()]
          .filter(([mn]) => !multiPhaseNames.has(mn))
          .sort((a, b) => a[1].localeCompare(b[1])),
      }));

    const multiPhaseAttacks = [...multiPhaseNames]
      .filter((mn) => attackTypeByMechanic.has(mn))
      .map((mn) => [mn, attackTypeByMechanic.get(mn)!] as [string, AttackType]);

    const multiPhaseFails = [...multiPhaseNames]
      .filter((mn) => failLabelByMechanic.has(mn))
      .map((mn) => [mn, failLabelByMechanic.get(mn)!] as [string, string])
      .sort((a, b) => a[1].localeCompare(b[1]));

    return { phaseFilterGroups, multiPhaseAttacks, multiPhaseFails };
  }, [attempts]);

  return (
    <Tabs.Root defaultValue="table">
      <Tabs.List>
        <Tabs.Trigger value="table">Übersicht</Tabs.Trigger>
        <Tabs.Trigger value="timeline">Details</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="table" className="mt-4">
        <Table.Root variant="surface" className="border-line bg-surface border">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Ergebnis</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Modus</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Weiteste Phase</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Dauer</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
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
                  <ModeBadge isCM={a.isCM} />
                </Table.Cell>
                <Table.Cell>
                  {a.furthestPhase ? (
                    <PhaseBadge
                      bossId={a.bossId}
                      name={a.furthestPhase.name}
                      order={a.furthestPhase.order}
                    />
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
                <Table.Cell className="text-right">
                  <RemoveLogButton
                    logFileId={a.logFileId}
                    confirmMessage={`Versuch #${a.n} (Log) endgültig aus diesem Batch löschen?`}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
            {attempts.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="text-muted">
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
            const color = phaseColor(bossId, bp.order, bp.name);
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
        <MechanicFilterAccordion
          bossId={bossId}
          phaseGroups={phaseFilterGroups}
          multiPhaseAttacks={multiPhaseAttacks}
          multiPhaseFails={multiPhaseFails}
          otherEntries={otherMechanicEntries}
          hidden={hiddenMechanics}
          onToggle={toggleMechanic}
          onSelectAll={selectAllMechanics}
          onDeselectAll={deselectAllMechanics}
        />
        <div className="border-line bg-surface divide-line-soft flex flex-col divide-y rounded-sm border">
          {attempts.map((a) => {
            const isOpen = expanded === a.n;
            const beamCasts = a.mechanics.filter((m) => m.mechanicName === "Beam.Cast");
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
                    className="flex flex-col gap-0.5 justify-self-start"
                    style={{ width: `${Math.max((a.durationMs / maxDurationMs) * 100, 4)}%` }}
                  >
                    {/* Lane 1: boss attacks — same icon size as the fail lane below,
                        positioned above the bar so the category reads from position
                        alone, not just from the glyph. */}
                    <span className="relative h-4 w-full">
                      {a.mechanics.map((m, i) => {
                        const type = attackType(m.mechanicName);
                        if (!type || hiddenMechanics.has(m.mechanicName)) return null;
                        const flipped =
                          type === "beam" ? beamCasts.indexOf(m) % 2 === 1 : undefined;
                        return (
                          <span
                            key={`attack-${i}`}
                            title={m.name}
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${(m.timeMs / a.durationMs) * 100}%` }}
                          >
                            <AttackGlyph type={type} flipped={flipped} />
                          </span>
                        );
                      })}
                    </span>
                    {/* Lane 2: phase-color bar */}
                    <span className="bg-line-soft relative h-2 w-full rounded-sm">
                      {a.segments.map((seg) => (
                        <span
                          key={seg.order}
                          title={seg.name}
                          className="absolute top-0 h-2 rounded-[1px]"
                          style={{
                            left: `${seg.leftPct}%`,
                            width: `${seg.widthPct}%`,
                            background: phaseColor(a.bossId, seg.order, seg.name),
                          }}
                        />
                      ))}
                    </span>
                    {/* Lane 3: fails/deaths — icon size matched to the attack lane. */}
                    <span className="relative h-4 w-full">
                      {a.deaths.map((d, i) => (
                        <span
                          key={`death-${i}`}
                          title={`Tod${d.player ? ` — ${d.player}` : ""}`}
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${(d.timeMs / a.durationMs) * 100}%` }}
                        >
                          <Cross2Icon className="text-danger h-3.5 w-3.5" />
                        </span>
                      ))}
                      {a.mechanics
                        .filter(
                          (m) =>
                            !isVisibleCastMarker(a.bossId, m.mechanicName) &&
                            !hiddenMechanics.has(m.mechanicName),
                        )
                        .map((m, i) => (
                          <span
                            key={`mech-${i}`}
                            title={m.name}
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${(m.timeMs / a.durationMs) * 100}%` }}
                          >
                            {m.mechanicName === "Downed" ? (
                              // eslint-disable-next-line @next/next/no-img-element -- fixed-size static icon, next/image is unnecessary overhead here
                              <img src="/icons/downed.png" alt="" className="h-4 w-2.5" />
                            ) : (
                              <ExclamationTriangleIcon className="text-warning h-3.5 w-3.5" />
                            )}
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
                      {a.phases.map((phase) => {
                        // Boss-attack cast markers ride along in phase.mechanics
                        // (needed to build the filter accordion above) but stay
                        // out of this plain-text fail summary.
                        const failMechanics = phase.mechanics.filter(
                          (m) => !isVisibleCastMarker(a.bossId, m.mechanicName),
                        );
                        return (
                          <div
                            key={phase.order}
                            className="bg-surface-2 border-line border-l-3 rounded-sm border-y border-r px-2.5 py-2"
                            style={{ borderLeftColor: phaseColor(a.bossId, phase.order, phase.name) }}
                          >
                            <div className="text-muted mb-1 text-[10px] uppercase">
                              {phase.name}
                            </div>
                            <div className="text-foreground text-xs font-semibold">
                              {phase.reached
                                ? phase.success
                                  ? "Abgeschlossen"
                                  : "Nicht abgeschlossen"
                                : "Nicht erreicht"}
                            </div>
                            {failMechanics.length > 0 ? (
                              <div className="text-muted-strong mt-1 text-[10.5px]">
                                {failMechanics
                                  .map((m) => m.name + (m.player ? ` (${m.player})` : ""))
                                  .join(", ")}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
