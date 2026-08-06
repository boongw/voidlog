import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "voidlog",
  description: "GW2 log analysis platform",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {session?.user ? (
          <header className="border-line flex items-center justify-between border-b px-4 py-3">
            <Link href="/" className="font-semibold">
              voidlog
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted">{session.user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className="text-muted hover:text-foreground underline">
                  Sign out
                </button>
              </form>
            </div>
          </header>
        ) : null}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
