import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptGitHubToken, fetchBlob, fetchRepositoryTree, githubApi, listGitHubRepositories, shouldIndexPath, sha256, type GitHubRepository } from "@/lib/github";

type Connection = { id: string; token_ciphertext: string; token_iv: string; token_auth_tag: string };

export async function POST() {
  const user = await requireUser();
  const sql = db();
  const rows = await sql<Connection[]>`
    select id, token_ciphertext, token_iv, token_auth_tag from github_connections where user_id = ${user.id} limit 1
  `;
  if (!rows[0]) return Response.json({ error: "GitHub is not connected" }, { status: 404 });
  const token = decryptGitHubToken(rows[0]);
  const repos = await listGitHubRepositories(token);
  let repositories = 0;
  let documents = 0;
  let research = 0;

  for (const repo of repos) {
    const repoRows = await sql<{ id: string }[]>`
      insert into github_repositories
        (connection_id, github_repo_id, full_name, name, is_private, default_branch, html_url, description, pushed_at, updated_at)
      values
        (${rows[0].id}, ${repo.id}, ${repo.full_name}, ${repo.name}, ${repo.private}, ${repo.default_branch}, ${repo.html_url}, ${repo.description}, ${repo.pushed_at}, ${repo.updated_at})
      on conflict (connection_id, github_repo_id) do update set
        full_name=excluded.full_name, name=excluded.name, is_private=excluded.is_private,
        default_branch=excluded.default_branch, html_url=excluded.html_url, description=excluded.description,
        pushed_at=excluded.pushed_at, updated_at=excluded.updated_at
      returning id
    `;
    const repositoryId = repoRows[0].id;
    repositories++;
    const [owner, name] = repo.full_name.split("/");
    if (!owner || !name) continue;
    const tree = await fetchRepositoryTree(token, owner, name, repo.default_branch);
    const candidates = tree.tree.filter((item) => item.type === "blob" && shouldIndexPath(item.path) && (item.size ?? 0) <= 512_000).slice(0, 2000);

    for (const item of candidates) {
      const content = await fetchBlob(token, owner, name, item.sha);
      const contentHash = sha256(content);
      const changed = await sql<{ id: string }[]>`
        insert into github_documents (repository_id, path, blob_sha, content, content_hash, size_bytes)
        values (${repositoryId}, ${item.path}, ${item.sha}, ${content}, ${contentHash}, ${item.size ?? content.length})
        on conflict (repository_id, path) do update set
          blob_sha=excluded.blob_sha, content=excluded.content, content_hash=excluded.content_hash,
          size_bytes=excluded.size_bytes, indexed_at=now()
        where github_documents.blob_sha is distinct from excluded.blob_sha
        returning id
      `;
      if (!changed[0]) continue;
      documents++;
      const excerpt = content.replace(/\s+/g, " ").trim().slice(0, 1800);
      const title = `${repo.full_name} · ${item.path}`;
      const researchRows = await sql<{ id: string }[]>`
        insert into research_records (user_id, source_type, source_id, title, summary, content, provenance)
        values (${user.id}, 'github', ${changed[0].id}, ${title}, ${excerpt.slice(0, 500)}, ${excerpt}, ${JSON.stringify({ repository: repo.full_name, path: item.path, blob_sha: item.sha, url: repo.html_url })}::jsonb)
        returning id
      `;
      if (researchRows[0]) {
        research++;
        await sql`
          insert into nexus_ingest_events (user_id, research_id, event_type, payload)
          values (${user.id}, ${researchRows[0].id}, 'research.github.document', ${JSON.stringify({ title, repository: repo.full_name, path: item.path, content_hash: contentHash })}::jsonb)
        `;
      }
    }
    await sql`update github_repositories set last_synced_at=now(), last_synced_commit=${repo.pushed_at ?? null} where id=${repositoryId}`;
  }

  return Response.json({ ok: true, repositories, documents, research, nexusQueued: research });
}
