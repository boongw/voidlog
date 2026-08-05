# voidlog — GW2 Log-Analyse-Plattform

Web-Anwendung zum Hochladen, Parsen und Vergleichen von Guild Wars 2
EVTC-Kampflogs, organisiert in Projekten/Trainingsgruppen über mehrere
Wochen/Monate. Architektur siehe
[`docs/ADR-GW2-Log-Analyse-Plattform.md`](docs/ADR-GW2-Log-Analyse-Plattform.md).

Aktueller Stand: **Schritt 1 — leeres Monorepo-Grundgerüst.** Kein
Business-Code, keine echten API-Calls, keine gestaltete UI.

## Struktur

```
apps/
  web/      Next.js (App Router, TypeScript, Tailwind) — Frontend + BFF
  worker/   Node/TS-Service — Grundgerüst für den Queue-Consumer (ADR-004)
packages/
  db/       Prisma-Setup (Client, Konfiguration; Schema folgt in Schritt 2)
  shared/   Gemeinsame TS-Typen: LogParser-Interface (ADR-002),
            Boss-Konfigurationstypen (ADR-009)
```

## Voraussetzungen

- Node.js >= 20
- [pnpm](https://pnpm.io/) (per `corepack enable` aktivierbar)
- Docker + Docker Compose (für Postgres, Redis, MinIO)

## Setup

```bash
pnpm install
docker compose up -d
cp .env.example .env
```

`.env` danach bei Bedarf anpassen (Discord-OAuth-Keys etc. — für Schritt 1
noch nicht erforderlich).

## Entwicklung

```bash
pnpm dev
```

Startet `apps/web` (http://localhost:3000) und `apps/worker` parallel.
`apps/web` zeigt aktuell die unveränderte Next.js-Standardseite.

Lokale Infrastruktur (Postgres auf `:5432`, Redis auf `:6379`, MinIO S3-API
auf `:9000` / Console auf `:9001`, Login `voidlog` / `voidlog123`) läuft
über `docker compose up -d` und wird beendet mit:

```bash
docker compose down
```

## Weitere Scripts

```bash
pnpm build          # baut alle Apps
pnpm lint           # ESLint über alle Packages
pnpm format         # Prettier über das gesamte Repo
pnpm typecheck       # tsc --noEmit über alle Packages
```

## Stand & nächste Schritte

- **Schritt 1 (dieser Stand):** Monorepo-Grundgerüst, lauffähig, ohne
  Business-Code.
- **Schritt 2:** Vollständiges Datenmodell + Migration, Storage-Client,
  Queue-Anbindung, echter `DpsReportParser`, SSE-Fortschritt — nachgewiesen
  per Testskript/curl, ohne UI.
- **Schritt 3:** https://gw2auth.com/ auth, geschützte Routen, alle Kernseiten
  unstyled an echte Daten aus Schritt 2 angebunden.
