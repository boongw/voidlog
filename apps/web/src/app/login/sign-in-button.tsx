"use client";

import { Button } from "@radix-ui/themes";
import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <Button
      type="button"
      size="3"
      onClick={() => signIn("discord")}
      className="!bg-discord w-full cursor-pointer !text-white"
    >
      Mit Discord anmelden
    </Button>
  );
}
