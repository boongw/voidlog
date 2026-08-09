# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

voidlog is a web app for uploading, parsing, and comparing Guild Wars 2 EVTC combat logs, organized into projects ("training groups") tracked over weeks/months. Architecture rationale for every major decision lives in [`docs/ADR-GW2-Log-Analyse-Plattform.md`](docs/ADR-GW2-Log-Analyse-Plattform.md) (German) — consult it (ADR-001 through ADR-009) before making structural changes; it explains *why*, not just *what*.

Currently only one boss encounter is curated end-to-end: Harvest Temple CM / "Die Drachenleere" (bossId `43488`, Dragon's End). Phase names, mechanic translations, and cast markers are all hand-curated per boss — see "Boss-specific curation" below.

## Commands

```bash
pnpm install
docker compose up -d        # Postgres :5432, Redis :6379, MinIO :9000 (console :9001, login voidlog/voidlog123)
cp .env.example .env
pnpm dev                     # runs apps/web (:3000) + apps/worker in parallel
```

```bash
pnpm build                   # builds apps/web and apps/worker
pnpm lint                    # eslint across all packages (pnpm --recursive run lint)
pnpm format                  # prettier --write .
pnpm typecheck                # root tsc --noEmit, then tsc --noEmit in every package
```

Per-package typecheck (apps/web has no root-level `typecheck` script of its own — use tsc directly):

```bash
pnpm --filter @voidlog/web exec tsc -p tsconfig.json --noEmit
pnpm --filter @voidlog/worker exec tsc --noEmit
```

No unit test framework is set up. The only test is an end-to-end data/job-flow proof script:

```bash
pnpm test:e2e                # storage upload -> queue -> worker -> Postgres, against MockParser by default
```

For a real dps.report run instead of the mock: set `LOG_PARSER=dps-report` and `TEST_EVTC_PATH=/path/to/file.evtc` in `.env`, restart the worker, then rerun.

```bash
pnpm seed:test-session        # creates a test user + valid DB session, prints an authjs.session-token
                               # cookie value to set manually — bypasses real Discord OAuth for local testing
```

Prisma (run from `packages/db`, or via `pnpm --filter @voidlog/db`):

```bash
pnpm --filter @voidlog/db run migrate:dev     # create + apply a migration locally
pnpm --filter @voidlog/db run migrate:deploy  # apply pending migrations (no new migration)
pnpm --filter @voidlog/db run studio          # Prisma Studio
pnpm --filter @voidlog/db run generate        # regenerate the Prisma client (needed after editing schema.prisma
                                               # if a dev server has the query engine DLL locked, stop it first)
```

## Monorepo structure

```
apps/
  web/      Next.js 16 (App Router, TypeScript, Tailwind v4, Radix Themes) — frontend + BFF, Auth.js/Discord
  worker/   Node/TS service — BullMQ queue consumer, LogParser, streaming extraction
packages/
  db/       Prisma schema + generated client (User/Project/ProjectMember/UploadBatch/LogFile/
            EncounterResult/PhaseResult/MechanicEvent/PlayerResult, plus Auth.js adapter tables)
  shared/   Cross-app TS types, S3-compatible storage client, BullMQ queue config/connection
scripts/
  test-e2e.ts           end-to-end data/job-flow proof (see above)
  seed-test-session.ts  dev login bypass (see above)
```

## Architecture

### Ingestion pipeline (upload → parsed data)

1. **Upload**: the web app hands out presigned S3 PUT URLs (ADR-003) — raw `.evtc`/`.zevtc` files go straight from the browser to object storage (MinIO locally, e.g. R2 in prod), never through the Next.js server. A `LogFile` row is created per file, `UploadBatch` groups files uploaded together.
2. **Enqueue**: the route handler enqueues one BullMQ job per `LogFile` on the `log-parsing` queue (`packages/shared/src/queue.ts`), then streams progress back to the browser over SSE.
3. **Parse**: `apps/worker` consumes the queue (`job-processor.ts`), running the raw file through a `LogParser` (ADR-002) — either `MockParser` or the real `DpsReportParser` (uploads to dps.report's API, polls until `jsonAvailable`, then streams back `/getJson`'s response). Selected via `LOG_PARSER` env var (`apps/worker/src/parsers/log-parser-factory.ts`). The worker centrally rate-limits to dps.report's global 25 uploads/60s (`apps/worker/src/index.ts`, BullMQ `limiter`).
4. **Extract**: `apps/worker/src/extraction/extract-encounter.ts` streams the EI JSON response through `stream-json` and picks out only a small, fixed set of fields (ADR-008) — the full response can be tens of MB, almost all of it per-player/per-target damage/buff breakdowns nobody reads. It keeps `phases`, `mechanics`, `skillMap`, and per-target `name`/`id`/`rotation` (boss cast log) whole, but never materializes `targets[]`'s much larger damage/buff/combat-replay fields. The exact field-picking logic (`ROOT_KEEP_WHOLE`, `PLAYER_KEEP_WHOLE`, `TARGET_KEEP_WHOLE`) is a hand-rolled streaming state machine — extend it carefully, it's easy to accidentally re-introduce full materialization.
5. **Persist**: `apps/worker/src/extraction/persist-encounter.ts` maps the extracted subset onto the Prisma schema (ADR-009) in one transaction: `EncounterResult` → `PhaseResult[]` → `PlayerResult[]` → `MechanicEvent[]`. Each mechanic event's `phaseResultId` is resolved by `resolvePhaseIndex`, which picks the *narrowest* phase containing the timestamp (not the first match — "Full Fight" spans the whole encounter and would otherwise swallow everything).
6. **Serve**: web app pages query Postgres directly via `@voidlog/db`'s Prisma client — the raw JSON itself is never stored, only the derived rows (so trend queries never re-parse).

### Boss-specific curation (hand-authored, not DB-editable — ADR-009)

Curation is deliberately code, not an editable admin table, and is split across several small files that all need to stay in sync when covering a new mechanic or boss:

- `apps/worker/src/boss-configs/cast-markers.ts` — boss-ability *casts* synthesized as `MechanicEvent` rows from the target's own cast log (`targets[].rotation`), independent of whether a player got hit. `mechanics[]` in the EI JSON only records hits, so a cast every player dodged is otherwise invisible. Two layers: a short curated list shown as distinct UI timeline ticks, plus a generic bulk capture of every other rotation skill per target (stored for later analysis, not surfaced in the UI yet). **Targets are matched by `EiTarget.id`, never `name`** — target names are localized to the recording client's game-client language (confirmed: the same encounter's giants are named differently in German vs. English clients, but share one stable `id`).
- `apps/worker/src/boss-configs/registry.ts` — per-boss `BossConfig` lookup (raw EI mechanic name → category/display name); currently only a `test-boss` fixture is registered, so all real bosses fall back to category `boss_specific` for every mechanic. This is the mechanism ADR-009 describes for curating `MechanicEvent.category`/`.displayName`, mostly still unused.
- `apps/web/src/lib/main-phases.ts` — which `PhaseResult` names count as a boss's "main" progression phases (e.g. the six dragon fights + Purification intermissions for Harvest Temple), filtering out EI's auto-generated breakbar/CM sub-phases from aggregate/summary views. Detail views intentionally stay unfiltered.
- `apps/web/src/lib/mechanic-names.ts` — human-readable German translations for raw EI mechanic short codes (e.g. `J.Breath.H` → "Atem Jormags — getroffen"), cross-checked against EI's own source where possible; unverified guesses are marked "(vermutlich)". Has a generic fallback humanizer for anything not in the curated map.
- `apps/web/src/lib/mechanics.ts` — which mechanic names are noise (achievement/res spam that would drown out real fails) vs. a curated cast marker that gets its own timeline icon.

### Auth & project scoping (ADR-007)

Auth.js with a Discord OAuth provider. Every project-scoped page/route must confirm membership before touching data — `apps/web/src/lib/session.ts` (`requireSession`) and `apps/web/src/lib/projects.ts` (`requireProjectMembership`/`requireProjectOwnership`) both wrap their DB lookup in React's `cache()`, so a layout and the page(s) it wraps share one query per request instead of duplicating it.

### Frontend

Next.js App Router with a `(app)` route group holding all authenticated pages under a shared sidebar layout; `app/login/` sits outside the group. Styling is Tailwind v4 + Radix Themes on a dark-only custom palette defined as CSS custom properties in `apps/web/src/app/globals.css` (no light mode). `apps/web/src/components/phase-badge.tsx` centralizes per-phase/per-dragon color assignment, reused across pages.

**`apps/web/AGENTS.md` is auto-regenerated by `next dev` on every run** (see `node_modules/next/dist/server/lib/generate-agent-files.js`) and warns that this project's Next.js version has training-data-breaking API/convention changes — consult `node_modules/next/dist/docs/` before writing Next.js-specific code rather than relying on prior knowledge of the framework.
