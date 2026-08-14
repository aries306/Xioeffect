import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = { title: "XIO", description: "Your personal intelligence layer" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app"><html lang="en"><body>{children}</body></html></ClerkProvider>;
}
