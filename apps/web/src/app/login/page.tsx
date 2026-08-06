import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">voidlog</h1>
      <p className="text-muted">
        GW2 combat log analysis for training groups. Sign in with GW2Auth to continue.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("gw2auth");
        }}
      >
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium"
        >
          Sign in with GW2Auth
        </button>
      </form>
    </main>
  );
}
