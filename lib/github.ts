import crypto from "node:crypto";

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
function encryptionKey() { const raw = Buffer.from(required("GITHUB_TOKEN_ENCRYPTION_KEY"), "base64"); if (raw.length !== 32) throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"); return raw; }

export function createPkceVerifier() { return crypto.randomBytes(32).toString("base64url"); }
export function pkceChallenge(verifier: string) { return crypto.createHash("sha256").update(verifier).digest("base64url"); }

export function githubAuthorizationUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({ client_id: required("GITHUB_CLIENT_ID"), redirect_uri: required("GITHUB_REDIRECT_URI"), scope: "repo read:user user:email", state, code_challenge: codeChallenge, code_challenge_method: "S256" });
  return `${GITHUB_AUTHORIZE}?${params.toString()}`;
}

export function encryptGitHubToken(token: string) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}
export function decryptGitHubToken(value: { ciphertext: string; iv: string; authTag: string }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64")); decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export async function exchangeGitHubCode(code: string, codeVerifier: string) {
  const response = await fetch(GITHUB_TOKEN, { method: "POST", headers: { Accept: "application/json" }, body: new URLSearchParams({ client_id: required("GITHUB_CLIENT_ID"), client_secret: required("GITHUB_CLIENT_SECRET"), code, redirect_uri: required("GITHUB_REDIRECT_URI"), code_verifier: codeVerifier }), cache: "no-store" });
  const body = await response.json(); if (!response.ok || body.error || !body.access_token) throw new Error(body.error_description ?? "GitHub token exchange failed"); return body.access_token as string;
}

export async function githubApi<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, { ...init, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`); return response.json() as Promise<T>;
}

export type GitHubRepository = { id: number; full_name: string; name: string; private: boolean; default_branch: string; html_url: string; description: string | null; pushed_at: string | null; updated_at: string };
export async function listGitHubRepositories(token: string) { const repos: GitHubRepository[] = []; for (let page = 1; page <= 100; page++) { const batch = await githubApi<GitHubRepository[]>(token, `/user/repos?per_page=100&page=${page}&sort=updated&direction=desc`); repos.push(...batch); if (batch.length < 100) break; } return repos; }
export async function fetchRepositoryTree(token: string, owner: string, repo: string, ref: string) { return githubApi<{ tree: Array<{ path: string; mode: string; type: string; sha: string; size?: number; url: string }>; truncated: boolean }>(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`); }
export async function fetchBlob(token: string, owner: string, repo: string, sha: string) { const blob = await githubApi<{ content: string; encoding: string }>(token, `/repos/${owner}/${repo}/git/blobs/${sha}`); if (blob.encoding !== "base64") throw new Error("Unexpected GitHub blob encoding"); return Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8"); }
export function shouldIndexPath(path: string) { if (path.startsWith(".git/") || path.includes("/node_modules/") || path.includes("/dist/") || path.includes("/build/")) return false; if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/i.test(path.split("/").pop() ?? "")) return false; return !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|otf|mp4|mov|mp3)$/i.test(path); }
export function sha256(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
