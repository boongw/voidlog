import { Queue, QueueEvents } from "bullmq";
import IORedis, { type Redis } from "ioredis";

/**
 * Queue wiring (ADR-004). A single "log-parsing" queue carries one job
 * per LogFile; the Next.js route handler enqueues, the worker consumes.
 * BullMQ also centralizes the dps.report rate limit (ADR-002) via its
 * `limiter` option, configured where the Worker is created in apps/worker.
 */
export const LOG_PARSING_QUEUE_NAME = "log-parsing";

export interface LogParsingJobData {
  logFileId: string;
}

let sharedConnection: Redis | undefined;

/** BullMQ requires `maxRetriesPerRequest: null` on the connection used for
 * blocking commands — see https://docs.bullmq.io/guide/going-to-production. */
export function createRedisConnection(): Redis {
  if (!sharedConnection) {
    const url = requireEnv("REDIS_URL");
    sharedConnection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return sharedConnection;
}

export function createLogParsingQueue(connection: Redis = createRedisConnection()): Queue<LogParsingJobData> {
  return new Queue<LogParsingJobData>(LOG_PARSING_QUEUE_NAME, { connection });
}

export function createLogParsingQueueEvents(
  connection: Redis = createRedisConnection(),
): QueueEvents {
  return new QueueEvents(LOG_PARSING_QUEUE_NAME, { connection });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
