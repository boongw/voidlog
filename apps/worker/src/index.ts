/**
 * Worker service entry point.
 *
 * Skeleton for the queue consumer from ADR-004. The actual queue wiring
 * (BullMQ/Redis), the LogParser call (ADR-002) and the extraction logic
 * (ADR-008/009) are added in step 2.
 */
function main(): void {
  console.log("[worker] starting up (skeleton, no queue wired yet)");

  process.on("SIGINT", () => {
    console.log("[worker] shutting down");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("[worker] shutting down");
    process.exit(0);
  });
}

main();
