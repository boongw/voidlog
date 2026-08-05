import type { Readable } from "node:stream";

/**
 * LogParser interface (ADR-002).
 *
 * Abstraction over turning a raw .evtc log into the EI JSON report. First
 * implementation (step 2) is `DpsReportParser` against the dps.report API
 * (/uploadContent, /getJson); a `MockParser` for tests without an
 * external dependency exists alongside it. `SelfHostedEiParser` remains a
 * documented migration path (see ADR-002).
 *
 * `parse()` intentionally does NOT return the parsed JSON as a materialized
 * value: ADR-008 found that a single EI JSON response can be tens of MB,
 * dominated by fields the product doesn't need. The parser instead hands
 * back a readable byte stream of the raw JSON response; the worker's
 * extraction step (ADR-008/009) consumes that stream selectively. This
 * split keeps "how do we obtain the report" (this interface, migratable
 * per ADR-002) separate from "how do we turn it into DB rows without
 * loading it all into memory" (extraction, applies to every JSON source).
 */
export interface ParsedLogHandle {
  /** Permalink to the interactive EI HTML report (ADR-006). */
  reportUrl: string;
  /** Raw bytes of the EI JSON response, not yet parsed. */
  jsonStream: Readable;
}

export interface LogParser {
  /**
   * @param rawFileRef Reference to the raw .evtc file in object storage
   * (ADR-003), e.g. the storage key.
   */
  parse(rawFileRef: string): Promise<ParsedLogHandle>;
}
