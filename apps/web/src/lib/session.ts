import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Fetches the current session for use in Server Components/Route
 * Handlers, redirecting to /login if there isn't one. `proxy.ts` already
 * blocks unauthenticated requests to protected routes (ADR-007); this is
 * the defensive second layer so pages never render with a null session.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
