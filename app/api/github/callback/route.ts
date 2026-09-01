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
  if (error) return Response.redirect(new URL(`/app?github=denied`, request.url));
  if (!code || !state || !expectedState || state !== expectedState) return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
  const user = await requireUser();
  if (!oauthUser || decodeURIComponent(oauthUser) !== user.id) return Response.json({ error: "OAuth session mismatch" }, { status: 403 });

  try {
    const token = await exchangeGitHubCode(code);
    const profile = await githubApi<GitHubProfile>(token, "/user");
    const encrypted = encryptGitHubToken(token);
    const sql = db();
    await sql`
      insert into github_connections
        (user_id, github_user_id, github_login, token_ciphertext, token_iv, token_auth_tag, scopes, updated_at)
      values
        (${user.id}, ${profile.id}, ${profile.login}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag}, ${"repo read:user user:email"}, now())
      on conflict (user_id) do update set
        github_user_id = excluded.github_user_id,
        github_login = excluded.github_login,
        token_ciphertext = excluded.token_ciphertext,
        token_iv = excluded.token_iv,
        token_auth_tag = excluded.token_auth_tag,
        scopes = excluded.scopes,
        updated_at = now()
    `;
    jar.delete("github_oauth_state");
    jar.delete("github_oauth_user");
    return Response.redirect(new URL(`/app?github=connected`, request.url));
  } catch {
    return Response.redirect(new URL(`/app?github=error`, request.url));
  }
}
