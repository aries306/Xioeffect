import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptGitHubToken, encryptGitHubToken, fetchBlob, fetchBranchHeadSha, fetchRepositoryTree, githubApi, listGitHubRepositories, refreshGitHubToken, shouldIndexPath, sha256 } from "@/lib/github";

type Connection = { id: string; token_ciphertext: string; token_iv: string; token_auth_tag: string; refresh_token_ciphertext: string | null; refresh_token_iv: string | null; refresh_token_auth_tag: string | null; access_token_expires_at: string | null; refresh_token_expires_at: string | null };

async function usableAccessToken(userId: string, connection: Connection, sql: ReturnType<typeof db>) {
  const current = decryptGitHubToken(connection);
  const expiresAt = connection.access_token_expires_at ? new Date(connection.access_token_expires_at).getTime() : 0;
  if (!expiresAt || expiresAt > Date.now() + 60_000) return current;
  if (!connection.refresh_token_ciphertext || !connection.refresh_token_iv || !connection.refresh_token_auth_tag) throw new Error("GitHub access token expired and no refresh token is available");
  const refreshToken = decryptGitHubToken({ ciphertext: connection.refresh_token_ciphertext, iv: connection.refresh_token_iv, authTag: connection.refresh_token_auth_tag });
  const refreshed = await refreshGitHubToken(refreshToken);
  const encrypted = encryptGitHubToken(refreshed.accessToken);
  const refresh = refreshed.refreshToken ? encryptGitHubToken(refreshed.refreshToken) : null;
  await sql`update github_connections set token_ciphertext=${encrypted.ciphertext}, token_iv=${encrypted.iv}, token_auth_tag=${encrypted.authTag}, refresh_token_ciphertext=${refresh?.ciphertext ?? null}, refresh_token_iv=${refresh?.iv ?? null}, refresh_token_auth_tag=${refresh?.authTag ?? null}, access_token_expires_at=${refreshed.accessTokenExpiresAt ?? null}, refresh_token_expires_at=${refreshed.refreshTokenExpiresAt ?? null}, scopes=case when ${refreshed.scopes} <> '' then ${refreshed.scopes} else scopes end, updated_at=now() where id=${connection.id} and user_id=${userId}`;
  return refreshed.accessToken;
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const requestedRepoIds = Array.isArray(body.repositoryIds) ? body.repositoryIds.filter((id: unknown): id is string => typeof id === "string") : null;
  const sql = db();
  const rows = await sql<Connection[]>`select id, token_ciphertext, token_iv, token_auth_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_auth_tag, access_token_expires_at, refresh_token_expires_at from github_connections where user_id=${user.id} limit 1`;
  if (!rows[0]) return Response.json({ error: "GitHub is not connected" }, { status: 404 });
  let token = await usableAccessToken(user.id, rows[0], sql);
  const repos = await listGitHubRepositories(token);
  let repositories = 0;
  let documents = 0;
  let research = 0;
  const failures: Array<{ repository: string; error: string }> = [];

  for (const repo of repos) {
    const repoRows = await sql<{ id: string; selected: boolean }[]>`insert into github_repositories (connection_id, github_repo_id, full_name, name, is_private, default_branch, html_url, description, pushed_at, updated_at) values (${rows[0].id}, ${repo.id}, ${repo.full_name}, ${repo.name}, ${repo.private}, ${repo.default_branch}, ${repo.html_url}, ${repo.description}, ${repo.pushed_at}, ${repo.updated_at}) on conflict (connection_id, github_repo_id) do update set full_name=excluded.full_name, name=excluded.name, is_private=excluded.is_private, default_branch=excluded.default_branch, html_url=excluded.html_url, description=excluded.description, pushed_at=excluded.pushed_at, updated_at=excluded.updated_at returning id, selected`;
    const repositoryId = repoRows[0].id;
    const shouldSync = requestedRepoIds ? requestedRepoIds.includes(repositoryId) : repoRows[0].selected;
    if (!shouldSync) continue;
    repositories++;
    await sql`update github_repositories set sync_status='syncing', sync_error=null where id=${repositoryId} and connection_id=${rows[0].id}`;
    try {
      const [owner, name] = repo.full_name.split("/");
      if (!owner || !name) throw new Error("Invalid GitHub repository name");
      const headSha = await fetchBranchHeadSha(token, owner, name, repo.default_branch);
      const existing = await sql<{ last_synced_commit: string | null }[]>`select last_synced_commit from github_repositories where id=${repositoryId}`;
      if (existing[0]?.last_synced_commit === headSha) {
        await sql`update github_repositories set last_synced_at=now(), sync_status='ready', sync_error=null where id=${repositoryId}`;
        continue;
      }
      const tree = await fetchRepositoryTree(token, owner, name, headSha);
      if (tree.truncated) throw new Error("GitHub repository tree is truncated; sync requires subtree pagination for this repository size");
      const candidates = tree.tree.filter((item) => item.type === "blob" && shouldIndexPath(item.path) && (item.size ?? 0) <= 512_000).slice(0, 2000);
      for (const item of candidates) {
        const known = await sql<{ blob_sha: string }[]>`select blob_sha from github_documents where repository_id=${repositoryId} and path=${item.path}`;
        if (known[0]?.blob_sha === item.sha) continue;
        const content = await fetchBlob(token, owner, name, item.sha);
        const contentHash = sha256(content);
        const changed = await sql<{ id: string }[]>`insert into github_documents (repository_id, path, blob_sha, content, content_hash, size_bytes) values (${repositoryId}, ${item.path}, ${item.sha}, ${content}, ${contentHash}, ${item.size ?? content.length}) on conflict (repository_id, path) do update set blob_sha=excluded.blob_sha, content=excluded.content, content_hash=excluded.content_hash, size_bytes=excluded.size_bytes, indexed_at=now() where github_documents.blob_sha is distinct from excluded.blob_sha returning id`;
        if (!changed[0]) continue;
        documents++;
        const excerpt = content.replace(/\s+/g, " ").trim().slice(0, 1800);
        const title = `${repo.full_name} · ${item.path}`;
        const provenance = { repository: repo.full_name, branch: repo.default_branch, commit_sha: headSha, path: item.path, blob_sha: item.sha, content_hash: contentHash, url: `${repo.html_url}/blob/${headSha}/${item.path}`, retrieved_at: new Date().toISOString() };
        const researchRows = await sql<{ id: string }[]>`insert into research_records (user_id, source_type, source_id, title, summary, content, provenance) values (${user.id}, 'github', ${changed[0].id}, ${title}, ${excerpt.slice(0, 500)}, ${excerpt}, ${JSON.stringify(provenance)}::jsonb) returning id`;
        if (researchRows[0]) {
          research++;
          const dedupeKey = sha256(`${user.id}:${changed[0].id}:${item.sha}`);
          await sql`insert into nexus_ingest_events (user_id, research_id, event_type, payload, dedupe_key) values (${user.id}, ${researchRows[0].id}, 'research.github.document', ${JSON.stringify({ title, repository: repo.full_name, path: item.path, commit_sha: headSha, blob_sha: item.sha, content_hash: contentHash })}::jsonb, ${dedupeKey}) on conflict (dedupe_key) do nothing`;
        }
      }
      await sql`update github_repositories set last_synced_at=now(), last_synced_commit=${headSha}, sync_status='ready', sync_error=null where id=${repositoryId}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub sync failed";
      failures.push({ repository: repo.full_name, error: message });
      await sql`update github_repositories set sync_status='error', sync_error=${message} where id=${repositoryId}`;
    }
  }

  return Response.json({ ok: failures.length === 0, repositories, documents, research, nexusQueued: research, failures }, { status: failures.length === 0 ? 200 : 207 });
}
