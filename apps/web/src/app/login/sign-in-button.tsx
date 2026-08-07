"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("discord")}
      className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
    >
      Sign in with Discord
    </button>
  );
}
