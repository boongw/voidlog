import { LogFileStatus, prisma } from "@voidlog/db";
import type { LogParser, LogParsingJobData } from "@voidlog/shared";
import { getBossConfig } from "./boss-configs/registry";
import { extractEncounterFromStream } from "./extraction/extract-encounter";
import { persistExtractedEncounter } from "./extraction/persist-encounter";

export async function processLogFileJob(data: LogParsingJobData, parser: LogParser): Promise<void> {
  const logFile = await prisma.logFile.findUniqueOrThrow({ where: { id: data.logFileId } });

  await prisma.logFile.update({
    where: { id: logFile.id },
    data: { status: LogFileStatus.PARSING, errorMessage: null },
  });

  try {
    const { reportUrl, jsonStream } = await parser.parse(logFile.storageKeyRaw);
    const extracted = await extractEncounterFromStream(jsonStream);

    const bossId =
      extracted.root.triggerID !== undefined ? String(extracted.root.triggerID) : undefined;
    const bossConfig = bossId ? getBossConfig(bossId) : undefined;

    await persistExtractedEncounter(logFile.id, extracted, bossConfig);

    await prisma.logFile.update({
      where: { id: logFile.id },
      data: { status: LogFileStatus.DONE, externalReportUrl: reportUrl },
    });
  } catch (error) {
    await prisma.logFile.update({
      where: { id: logFile.id },
      data: {
        status: LogFileStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
