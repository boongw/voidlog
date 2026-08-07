import type { ReactNode } from "react";
import { requireSession } from "@/lib/session";

/**
 * Auth gate for every authenticated route. Doesn't render the sidebar
 * itself — the dashboard page renders it directly (no project context),
 * and `projects/[projectId]/layout.tsx` renders it with project context.
 * Rendering it here too would nest two sidebars for all project routes.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return children;
}
