import { ProjectRole } from "@voidlog/db";
import { notFound } from "next/navigation";
import { prisma } from "@voidlog/db";

/**
 * Project-scoping (ADR-007): every project-level page/route must confirm
 * the current user is a ProjectMember before returning any data.
 */
export async function requireProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
  if (!membership) {
    notFound();
  }
  return membership;
}

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
