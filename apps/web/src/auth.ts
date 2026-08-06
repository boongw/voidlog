import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@voidlog/db";
import NextAuth from "next-auth";
import { GW2Auth } from "@/lib/gw2auth-provider";

/**
 * Auth.js configuration (ADR-007, amended: GW2Auth instead of Discord —
 * see project discussion). Database session strategy via PrismaAdapter so
 * sessions survive server restarts and are queryable for other purposes.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GW2Auth({
      clientId: process.env.AUTH_GW2AUTH_ID,
      clientSecret: process.env.AUTH_GW2AUTH_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.gw2AccountVerified = user.gw2AccountVerified ?? false;
      return session;
    },
  },
});
