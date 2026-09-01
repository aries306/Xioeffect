import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const sql = db();
  const rows = await sql`
    select r.id, r.github_repo_id, r.full_name, r.name, r.is_private, r.default_branch, r.html_url,
           r.description, r.selected, r.last_synced_at, r.last_synced_commit, r.sync_status, r.sync_error
    from github_repositories r
    join github_connections c on c.id=r.connection_id
    where c.user_id=${user.id}
    order by r.updated_at desc
  `;
  return Response.json({ repositories: rows });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.repositoryIds)) return Response.json({ error: "repositoryIds must be an array" }, { status: 400 });
  const ids = body.repositoryIds.filter((id: unknown): id is string => typeof id === "string");
  const sql = db();
  await sql`
    update github_repositories r set selected=false
    from github_connections c
    where r.connection_id=c.id and c.user_id=${user.id}
  `;
  if (ids.length) {
    await sql`
      update github_repositories r set selected=true
      from github_connections c
      where r.connection_id=c.id and c.user_id=${user.id} and r.id = any(${ids}::uuid[])
    `;
  }
  return Response.json({ ok: true, selected: ids.length });
}
