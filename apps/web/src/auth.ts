import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@voidlog/db";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

/**
 * Auth.js configuration (ADR-007). Database session strategy via
 * PrismaAdapter so sessions survive server restarts and are queryable for
 * other purposes.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [Discord],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
