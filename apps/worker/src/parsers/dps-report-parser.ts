import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { LogParser, ParsedLogHandle } from "@voidlog/shared";

interface EncounterMetadata {
  jsonAvailable: boolean;
}

interface UploadContentResponse {
  id: string;
  permalink: string;
  error?: string;
  encounter?: EncounterMetadata;
}

interface UploadMetadataResponse {
  encounter?: EncounterMetadata;
}

const JSON_POLL_INTERVAL_MS = 2_000;
const JSON_POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Real dps.report parser (ADR-002): uploads the raw .evtc via
 * /uploadContent, then hands back a byte stream of the /getJson response.
 * Never reads/materializes that response itself — extraction (ADR-008)
 * is the caller's responsibility, independent of which parser produced
 * the stream.
 */
export class DpsReportParser implements LogParser {
  constructor(
    private readonly getRawFile: (rawFileRef: string) => Promise<Buffer>,
    private readonly baseUrl: string = requireEnv("DPS_REPORT_BASE_URL"),
    private readonly uploadPath: string = process.env.DPS_REPORT_UPLOAD_PATH ?? "/uploadContent",
    private readonly jsonPath: string = process.env.DPS_REPORT_JSON_PATH ?? "/getJson",
    private readonly metadataPath: string =
      process.env.DPS_REPORT_METADATA_PATH ?? "/getUploadMetadata",
  ) {}

  async parse(rawFileRef: string): Promise<ParsedLogHandle> {
    const fileBuffer = await this.getRawFile(rawFileRef);

    const form = new FormData();
    form.append("file", new Blob([fileBuffer]), rawFileRef.split("/").pop() ?? "log.evtc");

    const uploadUrl = new URL(this.uploadPath, this.baseUrl);
    // json=1 returns a plain JSON object; without it, dps.report returns
    // its HTML "embed" format instead (JSON wrapped in an HTML comment,
    // meant for embedding upload widgets on third-party sites).
    uploadUrl.searchParams.set("json", "1");
    uploadUrl.searchParams.set("generator", "ei");

    const uploadResponse = await fetch(uploadUrl, { method: "POST", body: form });
    if (!uploadResponse.ok) {
      throw new Error(
        `dps.report upload failed: ${uploadResponse.status} ${await safeText(uploadResponse)}`,
      );
    }
    const uploadResult = (await uploadResponse.json()) as UploadContentResponse;
    if (uploadResult.error) {
      throw new Error(`dps.report reported an error: ${uploadResult.error}`);
    }

    // /uploadContent only guarantees a permalink; Elite Insights keeps
    // processing in the background afterward (docs: "seconds to several
    // minutes"). Calling /getJson before `encounter.jsonAvailable` is
    // true returns an HTML "still processing" placeholder instead of
    // JSON, so poll /getUploadMetadata until it flips.
    if (!uploadResult.encounter?.jsonAvailable) {
      await this.waitForJson(uploadResult.id);
    }

    const jsonUrl = new URL(this.jsonPath, this.baseUrl);
    jsonUrl.searchParams.set("id", uploadResult.id);
    const jsonResponse = await fetch(jsonUrl);
    if (!jsonResponse.ok || !jsonResponse.body) {
      throw new Error(
        `dps.report getJson failed: ${jsonResponse.status} ${await safeText(jsonResponse)}`,
      );
    }

    return {
      reportUrl: uploadResult.permalink,
      jsonStream: Readable.fromWeb(jsonResponse.body as NodeWebReadableStream),
    };
  }

  private async waitForJson(id: string): Promise<void> {
    const metadataUrl = new URL(this.metadataPath, this.baseUrl);
    metadataUrl.searchParams.set("id", id);

    const deadline = Date.now() + JSON_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const response = await fetch(metadataUrl);
      if (response.ok) {
        const metadata = (await response.json()) as UploadMetadataResponse;
        if (metadata.encounter?.jsonAvailable) return;
      }
      await sleep(JSON_POLL_INTERVAL_MS);
    }

    throw new Error(
      `dps.report did not finish processing report ${id} within ${JSON_POLL_TIMEOUT_MS}ms`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<no body>";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
