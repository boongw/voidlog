import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { LogParser, ParsedLogHandle } from "@voidlog/shared";

interface UploadContentResponse {
  id: string;
  permalink: string;
  error?: string;
}

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
  ) {}

  async parse(rawFileRef: string): Promise<ParsedLogHandle> {
    const fileBuffer = await this.getRawFile(rawFileRef);

    const form = new FormData();
    form.append("file", new Blob([fileBuffer]), rawFileRef.split("/").pop() ?? "log.evtc");

    const uploadUrl = new URL(this.uploadPath, this.baseUrl);
    // We fetch the full report separately via /getJson (streamed), so we
    // don't need dps.report to also embed it in the upload response.
    uploadUrl.searchParams.set("json", "0");
    uploadUrl.searchParams.set("generator", "ei");

    const uploadResponse = await fetch(uploadUrl, { method: "POST", body: form });
    if (!uploadResponse.ok) {
      throw new Error(`dps.report upload failed: ${uploadResponse.status} ${await safeText(uploadResponse)}`);
    }
    const uploadResult = (await uploadResponse.json()) as UploadContentResponse;
    if (uploadResult.error) {
      throw new Error(`dps.report reported an error: ${uploadResult.error}`);
    }

    const jsonUrl = new URL(this.jsonPath, this.baseUrl);
    jsonUrl.searchParams.set("id", uploadResult.id);
    const jsonResponse = await fetch(jsonUrl);
    if (!jsonResponse.ok || !jsonResponse.body) {
      throw new Error(`dps.report getJson failed: ${jsonResponse.status} ${await safeText(jsonResponse)}`);
    }

    return {
      reportUrl: uploadResult.permalink,
      jsonStream: Readable.fromWeb(jsonResponse.body as NodeWebReadableStream),
    };
  }
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
