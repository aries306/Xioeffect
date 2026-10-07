import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeGitHubCode, encryptGitHubToken, githubApi } from "@/lib/github";

type GitHubProfile = { id: number; login: string; name: string | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const expectedState = jar.get("github_oauth_state")?.value;
  const oauthUser = jar.get("github_oauth_user")?.value;
  const verifier = jar.get("github_oauth_verifier")?.value;

  jar.delete("github_oauth_state");
  jar.delete("github_oauth_user");
  jar.delete("github_oauth_verifier");

  if (error) return Response.redirect(new URL(`/app?github=denied`, request.url));
  if (!code || !state || !expectedState || state !== expectedState || !verifier) return Response.json({ error: "Invalid OAuth state" }, { status: 400 });

  const user = await requireUser();
  if (!oauthUser || decodeURIComponent(oauthUser) !== user.id) return Response.json({ error: "OAuth session mismatch" }, { status: 403 });

  try {
    const tokenSet = await exchangeGitHubCode(code, verifier);
    const profile = await githubApi<GitHubProfile>(tokenSet.accessToken, "/user");
    const encrypted = encryptGitHubToken(tokenSet.accessToken);
    const refresh = tokenSet.refreshToken ? encryptGitHubToken(tokenSet.refreshToken) : null;
    const sql = db();
    await sql`
      insert into github_connections
        (user_id, github_user_id, github_login, token_ciphertext, token_iv, token_auth_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_auth_tag,
         access_token_expires_at, refresh_token_expires_at, scopes, updated_at)
      values
        (${user.id}, ${profile.id}, ${profile.login}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag},
         ${refresh?.ciphertext ?? null}, ${refresh?.iv ?? null}, ${refresh?.authTag ?? null},
         ${tokenSet.accessTokenExpiresAt ?? null}, ${tokenSet.refreshTokenExpiresAt ?? null}, ${tokenSet.scopes}, now())
      on conflict (user_id) do update set
        github_user_id=excluded.github_user_id,
        github_login=excluded.github_login,
        token_ciphertext=excluded.token_ciphertext,
        token_iv=excluded.token_iv,
        token_auth_tag=excluded.token_auth_tag,
        refresh_token_ciphertext=excluded.refresh_token_ciphertext,
        refresh_token_iv=excluded.refresh_token_iv,
        refresh_token_auth_tag=excluded.refresh_token_auth_tag,
        access_token_expires_at=excluded.access_token_expires_at,
        refresh_token_expires_at=excluded.refresh_token_expires_at,
        scopes=excluded.scopes,
        updated_at=now()
    `;
    return Response.redirect(new URL(`/app?github=connected`, request.url));
  } catch {
    return Response.redirect(new URL(`/app?github=error`, request.url));
  }
}
