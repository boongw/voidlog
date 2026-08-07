import { Card, Text } from "@radix-ui/themes";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "./sign-in-button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="void-gradient-bg relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="void-orb bg-primary/25 -top-30 -left-25 absolute h-[480px] w-[480px]" />
      <div className="void-orb bg-success/15 -bottom-35 absolute -right-20 h-[420px] w-[420px] [animation-duration:8s]" />

      <Card
        size="4"
        className="border-line bg-surface/85 relative z-10 w-[420px] border backdrop-blur-sm"
      >
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="bg-primary h-[22px] w-[22px] [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" />
          <span className="font-heading text-foreground-strong text-xl font-bold tracking-wide">
            VOIDLOG
          </span>
        </div>
        <Text as="p" size="2" className="text-muted mb-8">
          GW2 Kampflog-Analyse für Trainingsgruppen
        </Text>

        <SignInButton />

        <Text as="p" size="1" className="text-muted mt-7 text-center">
          Zugang nur für eingeladene Trainingsgruppen
        </Text>
      </Card>
    </main>
  );
}
