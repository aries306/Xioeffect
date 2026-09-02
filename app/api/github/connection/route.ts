import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const sql = db();
  const connections = await sql`
    select github_login, github_user_id, scopes, created_at, updated_at, access_token_expires_at, refresh_token_expires_at
    from github_connections where user_id=${user.id} limit 1
  `;
  if (!connections[0]) return Response.json({ connected: false });
  const repositories = await sql`
    select id, full_name, selected, sync_status, sync_error, last_synced_at, last_synced_commit
    from github_repositories where connection_id=(select id from github_connections where user_id=${user.id} limit 1)
    order by updated_at desc
  `;
  return Response.json({ connected: true, connection: connections[0], repositories });
}

export async function DELETE() {
  const user = await requireUser();
  const sql = db();
  await sql`delete from github_connections where user_id=${user.id}`;
  return Response.json({ ok: true, disconnected: true });
}
