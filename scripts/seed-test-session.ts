import { randomUUID } from "node:crypto";
import { prisma } from "@voidlog/db";

/**
 * Dev-only helper to simulate a logged-in session without a real GW2Auth
 * OAuth round trip (which needs a registered client + interactive login
 * this script can't perform). Creates a user + database session row and
 * prints the cookie value to set manually in the browser.
 */
const user = await prisma.user.upsert({
  where: { email: "manual-test@voidlog.local" },
  update: {},
  create: {
    email: "manual-test@voidlog.local",
    name: "Manual Test User",
    gw2AccountVerified: true,
  },
});

const sessionToken = randomUUID();
await prisma.session.create({
  data: {
    sessionToken,
    userId: user.id,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

console.log(`userId=${user.id}`);
console.log(`sessionToken=${sessionToken}`);
await prisma.$disconnect();
