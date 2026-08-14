/** Provider-neutral boundary. Replace this with the selected auth provider's verified server SDK. */
export type AuthenticatedUser = { id: string; email: string };
export async function requireUser(): Promise<AuthenticatedUser> {
  throw new Error("Authentication is not configured");
}
