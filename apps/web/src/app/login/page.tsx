import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "./sign-in-button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">voidlog</h1>
      <p className="text-muted">
        GW2 combat log analysis for training groups. Sign in with Discord to continue.
      </p>
      <SignInButton />
    </main>
  );
}
