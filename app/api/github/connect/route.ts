import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import { githubAuthorizationUrl } from "@/lib/github";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const state = crypto.randomBytes(32).toString("hex");
    const response = Response.redirect(githubAuthorizationUrl(state));
    response.headers.append("Set-Cookie", `github_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    response.headers.append("Set-Cookie", `github_oauth_user=${encodeURIComponent(user.id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    return response;
  } catch {
    return Response.json({ error: "Authentication is required" }, { status: 401 });
  }
}
