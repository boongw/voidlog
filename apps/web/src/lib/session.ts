import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

/**
 * Fetches the current session for use in Server Components/Route
 * Handlers, redirecting to /login if there isn't one. `proxy.ts` already
 * blocks unauthenticated requests to protected routes (ADR-007); this is
 * the defensive second layer so pages never render with a null session.
 *
 * Wrapped in `cache()` so a layout and the page(s) it wraps share one
 * session lookup per request instead of each redoing it.
 */
export const requireSession = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
});
