import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./genesis.css";

export const metadata: Metadata = {
  title: "ZIO Genesis — A Living Intelligent Reality",
  description: "Bring me the thought. Explore the connections, evidence, and possibilities that emerge.",
  applicationName: "ZIO Genesis",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = <html lang="en"><body>{children}</body></html>;
  if (!publishableKey) return content;
  return <ClerkProvider publishableKey={publishableKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app">{content}</ClerkProvider>;
}
