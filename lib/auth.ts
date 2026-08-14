import { auth } from "@clerk/nextjs/server";

export type AuthenticatedUser = { id: string };

export async function requireUser(): Promise<AuthenticatedUser> {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication is required");
  return { id: userId };
}
