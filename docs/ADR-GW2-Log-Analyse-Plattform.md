# **Architecture Decision Record: GW2 Log-Analyse-Plattform**

**Projekt**: Web-Anwendung zum Hochladen, Parsen und Vergleichen von Guild Wars 2 EVTC-Kampflogs (arcdps) über GW2-Elite-Insights-Parser (EI), organisiert in Projekten/Trainingsgruppen über mehrere Wochen/Monate.

**Datum**: 2026-08-05 **Status**: Vorschlag (Proposed)

---

## **Kontext**

Die Anwendung soll Nutzern erlauben, pro Upload-Vorgang 20-30 `.evtc`/`.zevtc`\-Dateien hochzuladen, diese über den GW2-Elite-Insights-Parser (C\#/.NET-CLI) auszuwerten und die Ergebnisse innerhalb eines "Projekts" bzw. einer "Trainingsgruppe" über einen längeren Zeitraum zu vergleichen (Progression, Spieler-Benchmarks, Trends).

Zentrale Einschränkung: EI ist eine .NET-Konsolenanwendung, keine JS/TS-Bibliothek. Sie muss als eigener Dienst gekapselt werden. Das Parsen mehrerer, teils großer Binärdateien ist CPU- und speicherintensiv und darf nicht im Request-Zyklus des Web-Frontends laufen.

Die folgenden Entscheidungen sind als Einheit zu verstehen; sie bauen aufeinander auf.

---

## **ADR-001: Next.js statt Vite als Frontend-Framework**

**Entscheidung**: Next.js (App Router, TypeScript) statt Vite-SPA.

**Begründung**: Die Anforderung ist kein reines Client-Tool, sondern ein System mit Nutzerkonten, persistenten Projekten und Daten über Monate – das erfordert ohnehin einen Server für Auth, Datenbankzugriff und Job-Orchestrierung. Next.js vereint Server- und Client-Code in einem Projekt (Server Components für Dashboards/Listen, Route Handlers als Backend-for-Frontend, Server Actions), was Vite-SPA \+ separat gebautes Node-Backend an Entwicklungsaufwand nicht unterbietet.

**Alternative verworfen**: Vite-SPA \+ eigenständiges Node/Nest-Backend. Nur sinnvoll, wenn Frontend und Backend unabhängig skalieren/deployen müssen – hier nicht der Fall, da die eigentliche Skalierungslast (Parsing) ohnehin in einen separaten Worker-Dienst ausgelagert wird (siehe ADR-002).

**Konsequenzen**: Next.js-Deployment (z. B. Vercel) hat Limits bei Funktionslaufzeit und Payload-Größe – das ist unkritisch, da Parsing und große Datei-Uploads bewusst außerhalb der Next.js-Serverfunktionen laufen (ADR-003, ADR-004).

---

## **ADR-002: Parsing über die dps.report-API statt eigenem EI-Worker (mit Migrationspfad)**

**Status**: Akzeptiert für die initiale Version. Ersetzt die ursprüngliche Entscheidung "EI als eigener containerisierter Dienst".

**Entscheidung**: Statt EI selbst zu betreiben, nutzt der Worker die öffentliche API von [dps.report](https://dps.report/api) (`/uploadContent`, `/getJson`), die intern ebenfalls Elite Insights als Generator verwendet. Damit entfällt der Betrieb eines eigenen .NET-Runtime-Containers vollständig.

**Begründung**:

- `/getJson` liefert dasselbe vollständige EI-JSON, das auch ein selbst gehosteter Parser liefern würde – kein Verlust an Detailtiefe.  
- `/uploadContent` liefert zusätzlich einen Permalink zum fertigen, interaktiven EI-HTML-Report (Combat Replay etc.) – eigenes HTML-Hosting entfällt (siehe ADR-006).  
- Deutlich geringerer initialer Ops-Aufwand: kein Docker-Image mit .NET-Runtime, keine Versionspflege der EI-Binary, kein Speicher-/CPU-Tuning für den Parser selbst.

**Wichtige Einschränkungen, die bewusst in Kauf genommen werden**:

- Rate-Limit von 25 Requests/60s auf `/uploadContent`, **global für die gesamte Anwendung**, nicht pro Nutzer. Ein 20-30-Log-Batch passt knapp in ein Zeitfenster; bei mehreren gleichzeitig hochladenden Trainingsgruppen (z. B. nach einem gemeinsamen Reset-Day) muss der eigene Worker die Uploads über alle Projekte hinweg seriell durch dieses eine Limit schleusen. Die Queue aus ADR-004 bleibt daher zwingend bestehen – sie übernimmt hier zusätzlich die Rate-Limit-Steuerung gegenüber dps.report.  
- Kein SLA: dps.report ist ein von der Community betriebener Dienst ohne Verfügbarkeitsgarantie. Bei Ausfall steht das Kernfeature der App still.  
- Laut API-Doku bei hoher Serverlast bis zu 15 Minuten Verarbeitungszeit pro Datei möglich – nicht durch die eigene Anwendung kontrollierbar.  
- Rohe Kampflogs (inkl. Account-Namen) verlassen die eigene Infrastruktur. Das `anonymous=true`\-Flag würde das lösen, entfernt aber die Account-Zuordnung, die für Spieler-Progression über Monate benötigt wird – daher standardmäßig nicht anonymisiert, was in der Datenschutzerklärung transparent zu machen ist.  
- `uniqueId` zur eindeutigen Encounter-Erkennung ist laut Changelog aktuell nicht funktional; Deduplizierung muss bei Bedarf selbst über Boss-ID \+ Encounter-Zeitstempel \+ Spielerliste erfolgen.  
- Keine Kontrolle über Parser-Einstellungen (z. B. Memory-Limits, welche Berechnungen aktiviert sind) – es gilt, was dps.report serverseitig konfiguriert.

**Migrationspfad**: Der Worker kapselt den Parsing-Aufruf hinter einem eigenen `LogParser`\-Interface (z. B. `parse(rawFileRef) -> { metadata, json, reportUrl }`) mit `DpsReportParser` als erster Implementierung. Die ursprünglich geplante Alternative – EI als eigener Docker-Worker (`SelfHostedEiParser`) – bleibt als zweite Implementierung dieses Interfaces dokumentiert und wird nachgezogen, sobald eines der obigen Risiken (SLA-Ausfälle, Datenschutzanforderungen einer Gilde, Skalierung über die Rate-Limits hinaus) in der Praxis relevant wird. Da die Extraktions-/Mapping-Logik auf Basis des EI-JSON-Schemas ohnehin für beide Fälle identisch ist, ist der Wechsel ein lokal begrenzter Austausch der Implementierung, keine Neuarchitektur. Die empirische Größenanalyse in ADR-008 liefert dafür einen zusätzlichen, quantifizierten Trigger: dps.report liefert immer die volle Detailtiefe, unabhängig vom tatsächlichen Bedarf.

**Zu prüfen**: Nutzungsbedingungen von dps.report für automatisierte/gebündelte Uploads durch eine Drittanwendung (nicht nur Einzellog-Uploads durch Endnutzer) – ggf. Kontakt zum Betreiber wegen höherer Rate-Limits, wie in der API-Doku angeboten.

---

## **ADR-003: Direct-to-Storage-Upload statt Datei-Upload über die eigene API**

**Entscheidung**: Clients laden Dateien über Presigned URLs direkt in S3-kompatiblen Object Storage (z. B. Cloudflare R2) hoch. Die Next.js-API vergibt nur die Presigned URLs und nimmt danach die Liste der hochgeladenen Objekt-Keys entgegen.

**Begründung**: 20-30 Binärdateien durch eine Serverless-Funktion zu routen, stößt an Payload- und Timeout-Limits (z. B. Vercel: ca. 4,5 MB Funktions-Body) und belastet den Web-Tier unnötig.

**Konsequenzen**: CORS-Konfiguration auf dem Bucket nötig; Client-seitige Fortschrittsanzeige pro Datei erforderlich (native `fetch`/`XHR`\-Progress-Events).

---

## **ADR-004: Asynchrone Job-Verarbeitung über Queue \+ Worker statt synchronem Parsing**

**Entscheidung**: Nach Upload-Abschluss wird pro Batch ein Job in eine Queue (Redis/BullMQ oder Cloudflare Queues) eingereiht. Ein separater Worker-Dienst (Long-Running-Prozess, deploybar auf Fly.io, Railway oder Cloud Run) konsumiert die Queue, lädt die Rohdateien aus dem Object Storage, ruft den `LogParser` (siehe ADR-002, initial die dps.report-API) auf und schreibt Ergebnisse zurück.

**Begründung**: Entkoppelt Ingestion von Verarbeitung, ermöglicht horizontale Skalierung der Worker unabhängig vom Web-Tier, erlaubt Retries bei fehlgeschlagenen Parses und verhindert, dass lang laufende Wartezeiten (Parsing-Anfragen an dps.report können mehrere Minuten dauern, siehe ADR-002) den Web-Server blockieren. Da das Rate-Limit von dps.report global gilt, ist der Worker zusätzlich die zentrale Stelle, an der alle Uploads – projektübergreifend – seriell gedrosselt werden.

**Fortschrittsanzeige**: Server-Sent Events (SSE) vom Web-Server zum Client für Live-Status ("14/27 verarbeitet"). WebSockets sind für diesen unidirektionalen Anwendungsfall nicht nötig.

**Konsequenzen**: Zusätzliche Infrastrukturkomponente (Queue) und ein weiterer deploybarer Dienst (Worker) gegenüber einer reinen Next.js-Monolith-Lösung. Notwendiger Trade-off für Skalierbarkeit und Robustheit.

---

## **ADR-005: Zweigeteilte Datenhaltung – Object Storage für Rohdaten, PostgreSQL für Kennzahlen**

**Entscheidung**: Die rohe `.evtc`\-Datei sowie die von `/getJson` erhaltene EI-JSON-Antwort werden unverändert im Object Storage abgelegt (Cache/Archiv). Der HTML-Report wird **nicht** mehr selbst gehostet, sondern nur als externer Permalink (dps.report-URL) referenziert. Daraus extrahierte, strukturierte Kennzahlen (DPS, Boon-Uptimes, Deaths, Encounter-Erfolg je Spieler/Log) werden normalisiert in PostgreSQL gespeichert. Zugriff über Prisma oder Drizzle (TypeScript-first ORM).

**Begründung**: Die zentrale Produktanforderung "vergleichen über Wochen/Monate" erfordert schnelle Aggregationsabfragen (z. B. Ø-Gruppen-DPS auf Boss X über 3 Monate). Würden alle Kennzahlen nur als JSON-Blobs vorliegen, müsste bei jeder Trendabfrage neu geparst werden – nicht performant genug für ein wachsendes Archiv an Logs. Das Cachen der rohen `.evtc`\-Datei und des EI-JSON ist zusätzlich die Voraussetzung für den in ADR-002 beschriebenen Migrationspfad: Ohne eigenes Archiv der Rohdaten müsste bei einem späteren Wechsel auf einen selbst gehosteten Parser (oder bei Bedarf, historische Logs mit einer neuen EI-Version neu zu berechnen) erneut bei dps.report angefragt werden, was am globalen Rate-Limit scheitern könnte.

**Grobes Datenmodell** (siehe ADR-009 für die detaillierte Erweiterung um Phasen und Mechaniken):

User

 └─ Project (Trainingsgruppe)

     └─ UploadBatch (z. B. "Raid-Abend 2026-08-05")

         └─ LogFile (status: pending|parsing|done|failed,

                      storage\_key\_raw, storage\_key\_json,

                      external\_report\_url)

             └─ EncounterResult (boss, erfolg, dauer)

                 ├─ PhaseResult (phase\_name, start\_ms, end\_ms,

                 │               reached, success, players\_alive\_at\_start)

                 │    └─ MechanicEvent (player\_result\_id, mechanic\_name,

                 │                      category, time\_ms, context jsonb)

                 └─ PlayerResult (account, profession, dps,

                                  deaths, downs, role nullable, ...)

**Konsequenzen**: Erfordert einen Extraktionsschritt im Worker nach dem Parser-Aufruf (Mapping von EI-JSON auf das eigene Schema) – unabhängig davon, ob die JSON-Quelle dps.report oder ein späterer selbst gehosteter Parser ist. Managed Postgres (z. B. Neon oder Supabase) empfohlen für einfache Anbindung an Next.js. Wie in ADR-008 gezeigt, darf dieser Extraktionsschritt das JSON nicht vollständig in den Speicher laden (siehe dort für die Details und Zahlen).

Als Join-Key zwischen `mechanics[].mechanicsData[].actor` und `players[]` dient der Charaktername (`players[].name`) – das ist an einem realen Log verifiziert. Für die projekt- und monatsübergreifende Spielerzuordnung wird stattdessen `players[].account` verwendet, da sich Charakternamen ändern können, der Account-Handle (z. B. `Name.1234`) aber stabil bleibt.

---

## **ADR-006: Wiederverwendung des EI-HTML-Reports für Einzel-Log-Ansicht**

**Entscheidung**: Für die Detailansicht eines einzelnen Logs wird der von EI generierte, vollständig interaktive HTML-Report (Combat Replay, Buff-Tabellen, Damage-Graphen) verlinkt bzw. per iframe eingebettet, nicht in der eigenen App nachgebaut. Mit der Entscheidung aus ADR-002 ist dieser Report der von dps.report gehostete Permalink – eigenes HTML-Hosting entfällt damit vollständig.

**Begründung**: EI liefert hier bereits ein ausgereiftes, funktionsreiches UI. Der eigentliche Mehrwert der eigenen Anwendung liegt im Vergleich über mehrere Logs/Zeiträume hinweg – das leistet EI nicht. Aufwand sollte dorthin fließen, nicht in eine Neuimplementierung bereits vorhandener Funktionalität.

**Konsequenzen**: Abhängigkeit vom HTML-Output-Format von EI und zusätzlich von der Verfügbarkeit des Permalinks bei dps.report (siehe Risiken zu ADR-002). Bei einem späteren Wechsel auf den selbst gehosteten Parser (Migrationspfad ADR-002) müsste der Report wieder selbst generiert und gehostet werden – dann gilt wieder die ursprüngliche Einschränkung bzgl. `HtmlExternalScripts`/CSP beim Einbetten.

---

## **ADR-007: Auth über Auth.js mit Discord-OAuth, Projekt-Scoping**

**Entscheidung**: Auth.js (NextAuth) mit Discord als OAuth-Provider. Zugriff auf Projekte/Trainingsgruppen wird über eine Mitgliedschaftstabelle mit Rollen (Owner/Member) gesteuert; alle Datenabfragen sind projekt-gescoped.

**Begründung**: Die GW2-Community organisiert sich überwiegend über Discord, das senkt die Einstiegshürde gegenüber klassischem E-Mail/Passwort-Login.

**Konsequenzen**: Abhängigkeit von Discord als Identitätsprovider; sollte langfristig um mindestens einen zweiten Login-Weg ergänzbar sein (Magic Link).

---

## **ADR-008: Empirische Größenanalyse und selektive Extraktion statt vollständigem JSON.parse**

**Status**: Akzeptiert, basierend auf der Analyse eines realen 10-Spieler-CM-Logs ("Dragon Void", Wipe, 528s, 38,7 MB `getJson`\-Antwort).

**Entscheidung**: Der Worker parst das EI-JSON grundsätzlich mit einem streamenden/selektiven Ansatz (z. B. `stream-json` in Node) statt eines vollständigen `JSON.parse()`, unabhängig davon, ob die Quelle dps.report oder ein späterer selbst gehosteter Parser ist.

**Begründung – quantifizierte Analyse**: Eine Feldgrößen-Analyse des realen Logs zeigt eine extrem ungleiche Verteilung:

- `players` (90,7 % der Datei) \+ `targets` (8,7 %) \= **99,4 % der Gesamtgröße**.  
- `phases` \+ `mechanics` \+ Root-Skalare (`duration`, `success`, `isCM`, ...) – also exakt die Felder, die für Kampfdauer, erreichte Phasen und Mechanik-Auswertung gebraucht werden – summieren sich auf **0,2 % der Datei**.  
- Innerhalb eines einzelnen Spielerobjekts (\~3,5 Mio. Zeichen bei 10 Spielern): Buff-Tracking-Felder (`buffUptimes`, `selfBuffs`, `groupBuffs`, `offGroupBuffs`, `squadBuffs`, `buffVolumes`) sind **jeweils komplett dupliziert** als `...Active`\-Variante mit nahezu identischer Größe – zusammen ca. 45 % des players-Blocks. Pro-Ziel-/Pro-Sekunde-Aufschlüsselungen (`statsTargets`, `dpsTargets`, `targetDamage1S` u. Varianten, `targetDamageDist`) machen weitere ca. 25 % aus, Healing/Barrier-Extension-Daten (`extHealingStats`, `extBarrierStats`) ca. 8 %, Combat-Replay/Rotation (`combatReplayData`, `rotation`) ca. 2 %.  
- Die für das Produkt tatsächlich benötigten Felder pro Spieler (`account`, `name`, `profession`, `group`, `dpsAll`, `statsAll`, `defenses`, `support`, `deathRecap`, `consumables`, `activeTimes`) liegen bei geschätzt unter 2 % eines Spielerobjekts.

**Fazit in einer Zahl**: Von 38,7 MB werden realistisch deutlich unter 1 MB für die Kernfunktionen (Dauer, Phasen, Mechaniken, Spieler-Kennzahlen) benötigt. Der Rest dient ausschließlich der interaktiven HTML-Combat-Replay-Ansicht, die ohnehin über den dps.report-Permalink bereitgestellt wird (siehe ADR-006).

**Verifizierter Join-Key**: `players[].name` (Charaktername) entspricht exakt `mechanics[].mechanicsData[].actor` – an echten Daten geprüft. Für die Cross-Session-Zuordnung eines Spielers über Monate wird `players[].account` verwendet (stabiler als der Charaktername).

**Konsequenzen**:

- Der Extraktionsschritt im Worker (siehe ADR-005) muss als Streaming-Parser implementiert werden, der gezielt `phases`, `mechanics` sowie eine feste, kleine Feldliste pro Eintrag in `players`/`targets` herauspickt, statt das komplette Objekt zu materialisieren. Das gilt für **jede** JSON-Quelle, nicht nur dps.report.  
- Schärft den Migrationstrigger aus ADR-002: Da dps.report immer die volle Detailtiefe liefert, unabhängig vom Bedarf, könnte ein selbst gehosteter EI mit reduzierten `Compute*`/`RawTimelineArrays`\-Settings die Rohgröße pro Log potenziell drastisch senken. Ob sich insbesondere die `...Active`\-Duplizierung der Buff-Felder über Settings abschalten lässt, ist in der EI-Settings-Dokumentation zu verifizieren, bevor dies als sicherer Gewinn eingeplant wird.  
- Für weitere Stichproben wurde ein kleines, abhängigkeitsfreies Java-Tool (`JsonInspect.java`) gebaut, das Feldgrößen eines EI-JSON-Exports auflistet und eine kompakte Spieler-Identitäts-Zusammenfassung extrahiert – nützlich, um diese Analyse künftig an weiteren Logs (andere Bosse, längere Fights) zu wiederholen und die obigen Prozentsätze zu bestätigen oder zu widerlegen.

---

## **ADR-009: Domänenmodell für Phasen-/Mechanik-Auswertung und Boss-Konfiguration als Code**

**Status**: Akzeptiert, auf Basis konkreter fachlicher Anforderungen (Phasen-Fortschritt, Stealth/Reveal/Greens, boss-spezifische Mechaniken, Teilnahme- und Versuchsstatistiken, spätere Rollen-Auswertung).

**Entscheidung**: `PhaseResult` wird als eigene, normalisierte Tabelle unterhalb von `EncounterResult` geführt (nicht als JSONB-Feld wie ursprünglich in ADR-005 skizziert). `MechanicEvent` referenziert `PhaseResult` statt nur `EncounterResult`. Die Zuordnung, welcher rohe EI-Mechanik-Name welcher fachlichen Kategorie entspricht, erfolgt über eine pro Boss handkuratierte Konfiguration in Code (TypeScript), nicht über eine editierbare DB-Tabelle.

**Begründung**:

- *Phasen als eigene Tabelle*: Auswertungen wie "in wie viel % der Versuche wurde Phase X erreicht/erfolgreich abgeschlossen" oder "wie viele Spieler waren zu Phasenbeginn noch am Leben" erfordern GROUP-BY- und Filter-fähige Zeilen. Eine JSONB-Spalte müsste dafür bei jeder Abfrage entpackt werden – das widerspricht dem Grundgedanken aus ADR-005, Trendabfragen ohne erneutes Parsen zu ermöglichen.  
- *"Spieler lebendig zu Phasenbeginn"* benötigt keine zusätzlichen Rohdaten: Der Sterbezeitpunkt pro Spieler ergibt sich aus der ohnehin extrahierten `Dead`\-Mechanik (`mechanics[].mechanicsData[].time`); ein Vergleich gegen `PhaseResult.start_ms` bei der Extraktion reicht aus.  
- *Stealth, Reveals, Greens, boss-spezifische Mechaniken* sind einzelne, benannte Einträge in `mechanics[]`. Wie in ADR-002 an echten Daten gezeigt (z. B. `Red.B` als absichtliche Baiter-Rolle vs. `Red.H` als tatsächlicher Fehler, beide mit `Severity: Sev0`), lässt sich die fachliche Kategorie nicht aus `severity` ableiten. Es braucht eine handkuratierte Zuordnung pro Boss: rohe Mechanik-Namen → Kategorie (`mistake`, `stealth`, `reveal`, `green`, `boss_specific`) → Anzeigename.  
- *Boss-Konfiguration als Code statt DB-Tabelle*: Diese Zuordnung ändert sich selten, profitiert von Typsicherheit und Code-Review, und eine Admin-UI zur Pflege wäre für den aktuellen Funktionsumfang überdimensioniert. Bei Bedarf (z. B. wenn Nutzer selbst Kategorien anpassen wollen) ist eine Migration auf eine editierbare Tabelle ein lokal begrenzter Schritt, kein Strukturbruch.  
- *Punktuelle Buff-Korrelation (Beispiel Mordremoth-Wellen \+ Stabilität)*: Einzelne Mechaniken erfordern die Prüfung, ob ein Spieler zum Event-Zeitpunkt einen bestimmten Buff aktiv hatte. Das ist eine gezielte Ausnahme von der in ADR-008 begründeten Regel, Buff-Zeitreihen grundsätzlich zu verwerfen: Statt der kompletten Buff-Uptime-Tabellen wird nur für die in der Boss-Konfiguration als "buff-abhängig" markierten Mechaniken zum exakten Event-Zeitpunkt eine einzelne, bekannte Buff-ID in der Präsenz-Zeitreihe des betroffenen Spielers nachgeschlagen. Das Ergebnis landet in `MechanicEvent.context` (flexibles JSONB-Feld für mechanik-spezifische Zusatzinfos, z. B. `{"hadStability": true}`), statt für jede boss-spezifische Nuance eine neue Spalte zu migrieren.  
- *Teilnahme- und Versuchsstatistiken* ("welcher Spieler war bei wie vielen Versuchen dabei", "Versuche gesamt/mit Reveal, absolut und prozentual") sind reine SQL-Aggregationen über `EncounterResult`/`PhaseResult`/`MechanicEvent`/`PlayerResult`, gescoped nach `project_id` bzw. `batch_id`. Da Spieler über die Lebensdauer eines Projekts rotieren (Kadergröße 10, aber mehr als 10 unterschiedliche Teilnehmer über Monate), wird `PlayerResult.account` – nicht eine feste Roster-Tabelle – als Gruppierungsschlüssel verwendet, ergänzt um einen Index auf `(project_id, account)`.

**Rollen (zurückgestellt)**: `PlayerResult` erhält ein nullable `role`\-Feld, das vorerst manuell durch den Projekt-Owner gepflegt wird (pro Spieler und Log, da Rollen zwischen Versuchen wechseln können). Eine automatische Ableitung aus Kampfdaten (z. B. hoher Healing-Wert → Heiler) wird bewusst nicht in der ersten Version umgesetzt, da das bei Hybrid-Builds unzuverlässig wäre; das Feld ist aber von Anfang an vorgesehen, um spätere Auswertungen ("wie gut spielt Spieler X auf Rolle Y") ohne Schema-Bruch zu ermöglichen.

**Konsequenzen**: Die Extraktionslogik im Worker (ADR-008) muss pro Mechanik-Event zusätzlich die zugehörige Phase auflösen (`phase.start_ms <= event.time < phase.end_ms`, einmalig beim Ingest berechnet, nicht zur Lesezeit) und die Boss-Konfiguration konsultieren, um Kategorie und ggf. Buff-Korrelation zu bestimmen. Die Boss-Konfiguration selbst ist initial nur für die im Kontext genannten Bosse (Jormag, Primordus, Kralkatorrik, Mordremoth, Zhaitan, Soo-Won bzw. die "Dragon Void"-Encounter-Struktur) zu pflegen und wird bei Bedarf um weitere Bosse erweitert.

---

## **Offene Punkte / Risiken**

- Globales Rate-Limit von dps.report (25 Uploads/60s) erfordert zentrale Drosselung im Worker über alle Projekte/Nutzer hinweg (siehe ADR-002/ADR-004); bei absehbarem Wachstum frühzeitig Kontakt zum Betreiber wegen höherer Limits aufnehmen.  
- Kein SLA von dps.report – Monitoring/Alerting auf Fehlerraten des `LogParser`\-Aufrufs einplanen, damit Ausfälle schnell auffallen und kommuniziert werden können.  
- Bis zu 15 Minuten Verarbeitungszeit pro Datei bei hoher Last möglich – UI muss lange Wartezeiten pro Batch transparent kommunizieren (Status pro Log, kein blockierendes Warten).  
- Datenschutz: Rohlogs (inkl. Account-Namen) werden an dps.report übertragen und dort dauerhaft gehostet (Permalink); in Datenschutzerklärung/Nutzungsbedingungen der eigenen App offenlegen.  
- Validierung von Dateityp und \-größe vor dem Enqueue ist Pflicht, da fremde Binärdateien verarbeitet werden.  
- Fehlende Funktionalität von `uniqueId` bei dps.report – eigene Deduplizierungslogik (Boss-ID \+ Encounter-Zeitstempel \+ Spielerliste) vorsehen, falls benötigt.  
- Bei Aktivierung des Migrationspfads (selbst gehosteter EI-Worker, siehe ADR-002): Ressourcenlimits für den Worker-Container (EI besitzt eine `MemoryLimit`\-Einstellung mit definiertem Exit-Code 2 bei Überschreitung) müssen abgefangen werden; EI-Einstellungen `UploadToDPSReports`, `UploadToWingman`, `UploadToMistWarrior` müssen deaktiviert werden; Lizenz des EI-Repositories vor Redistribution der Binary prüfen.  
- Streaming-Extraktion (ADR-008) ist kein optionales Nice-to-have, sondern Voraussetzung für den Betrieb: Ein naives `JSON.parse()` auf 38-100 MB pro Log, multipliziert mit mehreren parallel laufenden Jobs aus einem 20-30-Log-Batch, führt zu Speicherdruck im Worker-Container. Vor dem produktiven Rollout sollte die 90,7-%/8,7-%-Verteilung (players/targets) an weiteren Logs (andere Bosse, längere Fights, mehr Spieler) verifiziert werden, um die Extraktionslogik nicht auf ein einzelnes Beispiel zu überfitten.

---

## **High-Level-Übersicht**

┌─────────────┐      Presigned URL       ┌──────────────────┐

│   Next.js    │ ───────────────────────▶│  Object Storage    │

│  (Frontend \+ │                          │  (R2/S3): raw evtc,│

│   BFF/API)   │◀───── Batch-Metadaten ───│  EI-JSON-Cache      │

└──────┬───────┘                          └─────────┬─────────┘

       │ enqueue Job                                │ read/write

       ▼                                             ▼

┌─────────────┐                          ┌──────────────────┐         ┌──────────────────┐

│    Queue     │ ───────consume──────────▶│  Worker (LogParser│──HTTP──▶│   dps.report API   │

│ (Redis/Bull) │   (zentrale Rate-Limit-  │  Interface,        │        │ uploadContent /     │

└─────────────┘   Drosselung ggü.         │  initial: dps.report)│      │ getJson              │

                   dps.report)             └─────────┬─────────┘        └──────────────────┘

                                                     │ extrahierte Kennzahlen

                                                     │ \+ Permalink (HTML-Report)

                                                     ▼

                                          ┌──────────────────┐

                                          │   PostgreSQL      │

                                          │ (Prisma/Drizzle)  │

                                          └──────────────────┘

Migrationspfad (bei Bedarf, siehe ADR-002): `LogParser`\-Interface bekommt eine zweite Implementierung `SelfHostedEiParser`, die anstelle des HTTP-Aufrufs an dps.report einen eigenen Docker-Worker mit EI-CLI anspricht. Queue, Object Storage und Postgres-Schema bleiben unverändert.

Der Pfeil "extrahierte Kennzahlen" im Diagramm steht für eine Streaming-Extraktion (ADR-008), nicht für vollständiges Einlesen der JSON-Antwort in den Speicher.  
