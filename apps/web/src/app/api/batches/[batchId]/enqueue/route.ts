import { LogFileStatus, prisma } from "@voidlog/db";
import { createLogParsingQueue } from "@voidlog/shared";
import { NextResponse } from "next/server";

/**
 * Enqueues one log-parsing job per pending LogFile in the batch (ADR-004).
 * The queue is also the central place dps.report's global rate limit
 * (ADR-002) gets enforced, on the worker side.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;

  const pendingLogFiles = await prisma.logFile.findMany({
    where: { batchId, status: LogFileStatus.PENDING },
    select: { id: true },
  });

  if (pendingLogFiles.length === 0) {
    return NextResponse.json({ enqueued: 0 });
  }

  const queue = createLogParsingQueue();
  await queue.addBulk(
    pendingLogFiles.map((logFile) => ({
      name: "parse-log",
      data: { logFileId: logFile.id },
    })),
  );

  return NextResponse.json({ enqueued: pendingLogFiles.length });
}
