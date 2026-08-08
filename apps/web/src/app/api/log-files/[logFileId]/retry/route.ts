import { LogFileStatus, prisma } from "@voidlog/db";
import { createLogParsingQueue } from "@voidlog/shared";
import { NextResponse } from "next/server";
import { requireProjectMembership } from "@/lib/projects";
import { requireSession } from "@/lib/session";

/**
 * Re-enqueues a single failed LogFile for parsing (e.g. after a transient
 * dps.report error). Resets it to PENDING so it shows up as queued again
 * before the worker picks up the new job.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ logFileId: string }> },
) {
  const { logFileId } = await params;
  const session = await requireSession();

  const logFile = await prisma.logFile.findUnique({
    where: { id: logFileId },
    include: { batch: true },
  });
  if (!logFile) {
    return NextResponse.json({ error: "Log file not found" }, { status: 404 });
  }
  await requireProjectMembership(logFile.batch.projectId, session.user.id);

  if (logFile.status !== LogFileStatus.FAILED) {
    return NextResponse.json({ error: "Only failed log files can be retried" }, { status: 400 });
  }

  await prisma.logFile.update({
    where: { id: logFileId },
    data: { status: LogFileStatus.PENDING, errorMessage: null },
  });

  const queue = createLogParsingQueue();
  await queue.add("parse-log", { logFileId });

  return NextResponse.json({ status: "queued" });
}
