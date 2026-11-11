import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("Clerk middleware initializes auth for application and API requests", async () => {
  const proxy = await read("proxy.ts");
  assert.match(proxy, /clerkMiddleware/);
  assert.match(proxy, /createRouteMatcher/);
  assert.match(proxy, /\/app\(\.\*\)/);
  assert.match(proxy, /auth\.protect\(\)/);
  assert.match(proxy, /signInUrl: "\/sign-in"/);
  assert.match(proxy, /\/\(api\|trpc\)\(\.\*\)/);
});

test("Clerk is mandatory in staging and production", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
  assert.match(layout, /APP_ENV/);
  assert.match(layout, /appEnv === "production" \|\| appEnv === "staging"/);
  assert.match(layout, /Clerk is required/);
  assert.match(layout, /ClerkProvider/);
  assert.match(layout, /signInUrl="\/sign-in"/);
  assert.match(layout, /signUpUrl="\/sign-up"/);
});

test("API identity is derived from a verified Clerk session before workspace authorization", async () => {
  const auth = await read("lib/auth.ts");
  const workspace = await read("lib/workspace.ts");
  assert.match(auth, /await auth\(\)/);
  assert.match(auth, /if \(!userId\)/);
  assert.match(workspace, /requireUser/);
  assert.match(workspace, /workspace_members/);
  assert.match(workspace, /assertRole/);
  assert.match(workspace, /wm\.user_id=\$\{userId\}/);
});

test("GitHub OAuth uses state, PKCE, short-lived HttpOnly cookies, and encrypted token storage", async () => {
  const connect = await read("app/api/github/connect/route.ts");
  const callback = await read("app/api/github/callback/route.ts");
  const github = await read("lib/github.ts");
  assert.match(connect, /randomBytes\(32\)/);
  assert.match(connect, /pkceChallenge\(verifier\)/);
  assert.match(connect, /HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=600/);
  assert.match(callback, /state !== expectedState/);
  assert.match(callback, /oauthUser !== user\.id/);
  assert.match(github, /aes-256-gcm/);
  assert.match(github, /GITHUB_TOKEN_ENCRYPTION_KEY/);
  assert.match(github, /code_challenge_method: "S256"/);
});
