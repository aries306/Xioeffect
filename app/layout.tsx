import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./genesis.css";

export const metadata: Metadata = {
  title: "Exelta — A Living Intelligence Universe",
  description: "Exelta is a living intelligence environment built around contextual memory, reasoning, and action.",
  applicationName: "Exelta",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = <html lang="en"><body>{children}</body></html>;
  if (!publishableKey) return content;
  return <ClerkProvider publishableKey={publishableKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app">{content}</ClerkProvider>;
}
