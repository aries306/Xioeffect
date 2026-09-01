import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import { createPkceVerifier, githubAuthorizationUrl, pkceChallenge } from "@/lib/github";

export async function GET() {
  try {
    const user = await requireUser();
    const state = crypto.randomBytes(32).toString("hex");
    const verifier = createPkceVerifier();
    const response = Response.redirect(githubAuthorizationUrl(state, pkceChallenge(verifier)));
    response.headers.append("Set-Cookie", `github_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    response.headers.append("Set-Cookie", `github_oauth_user=${encodeURIComponent(user.id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    response.headers.append("Set-Cookie", `github_oauth_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    return response;
  } catch {
    return Response.json({ error: "Authentication is required" }, { status: 401 });
  }
}
