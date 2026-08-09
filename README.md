# voidlog — GW2 Log-Analyse-Plattform

Web-Anwendung zum Hochladen, Parsen und Vergleichen von Guild Wars 2
EVTC-Kampflogs, organisiert in Projekten/Trainingsgruppen über mehrere
Wochen/Monate. Architektur siehe
[`docs/ADR-GW2-Log-Analyse-Plattform.md`](docs/ADR-GW2-Log-Analyse-Plattform.md).

Aktueller Stand: **Schritt 3 — Auth (Discord) + Basic UI.** Alle Kernseiten
sind an echte Daten angebunden und mit Login geschützt, aber bewusst noch
unstyled.

## Struktur

```
apps/
  web/      Next.js (App Router, TypeScript, Tailwind) — Frontend + BFF,
            Auth.js mit Discord-Provider (ADR-007)
  worker/   Node/TS-Service — Queue-Consumer, LogParser, Extraktion
            (ADR-002/004/008/009)
packages/
  db/       Prisma-Schema (User/Project/ProjectMember/UploadBatch/LogFile/
            EncounterResult/PhaseResult/MechanicEvent/PlayerResult,
            Auth.js-Adaptertabellen)
  shared/   Gemeinsame TS-Typen, S3-Storage-Client (ADR-003),
            BullMQ-Queue-Konfiguration (ADR-004)
scripts/
  test-e2e.ts          End-to-End-Test des Daten-/Job-Flusses (Schritt 2)
  seed-test-session.ts Dev-Login-Bypass ohne echte Discord-Anwendung (siehe unten)
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

### Discord-Anwendung registrieren (für echten Login)

1. Auf der [Discord Developer Portal](https://discord.com/developers/applications)
   eine neue Anwendung anlegen.
2. Unter "OAuth2" eine Redirect-URI hinzufügen:
   `http://localhost:3000/api/auth/callback/discord`.
3. `AUTH_DISCORD_ID` (Client ID) und `AUTH_DISCORD_SECRET` (Client Secret)
   in `.env` eintragen.

### Ohne eigene Discord-Anwendung testen

```bash
pnpm seed:test-session
```

Legt einen Test-User + eine gültige DB-Session an und gibt den
Cookie-Wert (`authjs.session-token`) aus, den man im Browser (DevTools →
Application → Cookies) für `127.0.0.1:3000` setzen kann, um die
geschützten Seiten ohne echten OAuth-Flow zu sehen.

## Entwicklung

```bash
pnpm dev
```

Startet `apps/web` (http://127.0.0.1:3000) und `apps/worker` parallel.

Lokale Infrastruktur (Postgres auf `:5432`, Redis auf `:6379`, MinIO S3-API
auf `:9000` / Console auf `:9001`, Login `voidlog` / `voidlog123`) läuft
über `docker compose up -d` und wird beendet mit:

```bash
docker compose down
```

## Testen

```bash
pnpm test:e2e
```

Beweist den kompletten Daten-/Job-Fluss (Storage-Upload → Queue → Worker →
Postgres) ohne UI, per Default gegen `MockParser` (keine externe
Abhängigkeit). Für einen echten dps.report-Testlauf: `LOG_PARSER=dps-report`
und `TEST_EVTC_PATH=/pfad/zur/datei.evtc` setzen, Worker neu starten, dann
erneut ausführen.

## Weitere Scripts

```bash
pnpm build          # baut alle Apps
pnpm lint           # ESLint über alle Packages
pnpm format         # Prettier über das gesamte Repo
pnpm typecheck       # tsc --noEmit über alle Packages
```

## Stand & nächste Schritte

- [x] Monorepo-Grundgerüst, lauffähig, ohne Business-Code.
- [x] Vollständiges Datenmodell + Migration, Storage-Client,
  Queue-Anbindung, echter `DpsReportParser`, SSE-Fortschritt — nachgewiesen
  per Testskript/curl, ohne UI.
- [x] Auth.js mit Discord-Provider (ADR-007),
  geschützte Routen, alle sieben Kernseiten (Login, Dashboard,
  Projekt-Detail, Batch-Upload, Batch-Detail, Log-Analyse, Roster) an
  echte Daten angebunden, Design-Tokens in `globals.css` isoliert für das
  spätere Reskinning.
- [ ] Mechaniken Filter für individuellen Ein-/Ausblenden
- [ ] Reveals analysieren
- [ ] Upload-Reihenfolge der Logs
- [ ] Mechaniken-Aggregation über einen Log-Batch verbessern
- [ ] Diagramme für die Batch Übersicht
