/**
 * LogParser interface (ADR-002).
 *
 * Abstraction over the evaluation of a raw .evtc log. First
 * implementation (step 2) is `DpsReportParser` against the dps.report
 * API (/uploadContent, /getJson); a `MockParser` for tests follows in
 * step 2 as well. `SelfHostedEiParser` remains a documented migration
 * path (see ADR-002).
 */

export interface ParsedLogMetadata {
  /** Boss/encounter id as reported by EI/dps.report. */
  bossId: string;
  bossName: string;
  success: boolean;
  /** Encounter duration in milliseconds. */
  durationMs: number;
  /** Timestamp of the encounter (ISO 8601). */
  encounterTime: string;
}

export interface ParsedLog {
  metadata: ParsedLogMetadata;
  /** Full EI JSON as returned by dps.report/getJson. */
  json: unknown;
  /** Permalink to the interactive EI HTML report (ADR-006). */
  reportUrl: string;
}

export interface LogParser {
  /**
   * @param rawFileRef Reference to the raw .evtc file in object storage
   * (ADR-003), e.g. the storage key.
   */
  parse(rawFileRef: string): Promise<ParsedLog>;
}
