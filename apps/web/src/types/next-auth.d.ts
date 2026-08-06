import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    gw2AccountVerified?: boolean;
  }

  interface Session {
    user: {
      id: string;
      gw2AccountVerified: boolean;
    } & DefaultSession["user"];
  }
}
