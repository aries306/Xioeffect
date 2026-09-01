import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { exchangeGitHubCode, encryptGitHubToken } from "@/lib/github";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const expectedState = jar.get("github_oauth_state")?.value;
  const oauthUser = jar.get("github_oauth_user")?.value;
  if (error) return Response.redirect(new URL(`/app?github=denied`, request.url));
  if (!code || !state || !expectedState || state !== expectedState) return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
  const user = await requireUser();
  if (!oauthUser || decodeURIComponent(oauthUser) !== user.id) return Response.json({ error: "OAuth session mismatch" }, { status: 403 });
  try {
    const token = await exchangeGitHubCode(code);
    const encrypted = encryptGitHubToken(token);
    const target = new URL("/app?github=connected", request.url);
    const response = Response.redirect(target);
    response.headers.set("x-github-token-ciphertext", encrypted.ciphertext);
    response.headers.set("x-github-token-iv", encrypted.iv);
    response.headers.set("x-github-token-auth-tag", encrypted.authTag);
    jar.delete("github_oauth_state");
    jar.delete("github_oauth_user");
    return response;
  } catch {
    return Response.redirect(new URL(`/app?github=error`, request.url));
  }
}
