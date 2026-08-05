import { createStorageClient, getObjectBuffer, type LogParser } from "@voidlog/shared";
import { DpsReportParser } from "./dps-report-parser.js";
import { MockParser } from "./mock-parser.js";

export type LogParserImpl = "mock" | "dps-report";

/**
 * Picks the LogParser implementation (ADR-002). Defaults to "mock" so
 * `pnpm dev` / the e2e test script work offline out of the box; set
 * LOG_PARSER=dps-report to exercise the real dps.report API against a
 * real .evtc file in storage.
 */
export function createLogParser(impl: LogParserImpl = resolveImplFromEnv()): LogParser {
  if (impl === "mock") return new MockParser();

  const storageClient = createStorageClient();
  return new DpsReportParser((key) => getObjectBuffer(storageClient, key));
}

function resolveImplFromEnv(): LogParserImpl {
  const raw = process.env.LOG_PARSER ?? "mock";
  if (raw !== "mock" && raw !== "dps-report") {
    throw new Error(`Invalid LOG_PARSER env value "${raw}", expected "mock" or "dps-report"`);
  }
  return raw;
}
