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
