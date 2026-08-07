import { ProjectRole, prisma } from "@voidlog/db";
import { notFound } from "next/navigation";
import { cache } from "react";

/**
 * Project-scoping (ADR-007): every project-level page/route must confirm
 * the current user is a ProjectMember before returning any data.
 *
 * Wrapped in React's `cache()` so the project layout and the page it
 * wraps — both of which need this check — share one DB query per
 * request instead of two.
 */
export const requireProjectMembership = cache(async (projectId: string, userId: string) => {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
  if (!membership) {
    notFound();
  }
  return membership;
});

/**
 * Deleting a whole project affects every member's data, not just the
 * caller's — restrict it to the project owner rather than any member.
 */
export async function requireProjectOwnership(projectId: string, userId: string) {
  const membership = await requireProjectMembership(projectId, userId);
  if (membership.role !== ProjectRole.OWNER) {
    notFound();
  }
  return membership;
}
