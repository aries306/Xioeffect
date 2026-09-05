import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type Workspace = {
  id: string;
  name: string;
  context: Record<string, unknown>;
};

export async function ensureWorkspace(): Promise<{ userId: string; workspace: Workspace }> {
  const authUser = await requireUser();
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Authenticated user could not be resolved");

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const sql = db();

  let users = await sql`select id from users where clerk_user_id=${authUser.id} limit 1`;
  if (!users[0] && email) {
    users = await sql`select id from users where email=${email} limit 1`;
    if (users[0]) {
      await sql`update users set clerk_user_id=${authUser.id}, display_name=${displayName}, email=${email} where id=${users[0].id}`;
    }
  }
  if (!users[0]) {
    users = await sql`
      insert into users (clerk_user_id, email, display_name)
      values (${authUser.id}, ${email}, ${displayName})
      returning id
    `;
  }
  const userId = String(users[0].id);
  await sql`
    insert into preferences (user_id) values (${userId}) on conflict (user_id) do nothing
  `;

  let workspaces = await sql`
    select w.id, w.name, w.context
    from workspaces w
    join workspace_members wm on wm.workspace_id=w.id
    where wm.user_id=${userId} and wm.role in ('owner','editor','viewer')
    order by w.created_at asc
    limit 1
  `;
  if (!workspaces[0]) {
    workspaces = await sql`
      insert into workspaces (owner_user_id, name)
      values (${userId}, 'Personal Workspace')
      returning id, name, context
    `;
    await sql`
      insert into workspace_members (workspace_id, user_id, role)
      values (${workspaces[0].id}, ${userId}, 'owner')
    `;
  }

  return { userId, workspace: workspaces[0] as Workspace };
}

export async function getAuthorizedWorkspace(workspaceId?: string) {
  const { userId, workspace } = await ensureWorkspace();
  if (workspaceId && workspaceId !== String(workspace.id)) {
    const sql = db();
    const rows = await sql`
      select w.id, w.name, w.context
      from workspaces w
      join workspace_members wm on wm.workspace_id=w.id
      where w.id=${workspaceId} and wm.user_id=${userId}
      limit 1
    `;
    if (!rows[0]) throw new Error("Workspace access denied");
    return { userId, workspace: rows[0] as Workspace };
  }
  return { userId, workspace };
}

export async function readWorkspaceState(workspaceId: string) {
  const { userId, workspace } = await getAuthorizedWorkspace(workspaceId);
  const sql = db();
  const goals = await sql`
    select id, title, progress, status, created_at, updated_at
    from goals where user_id=${userId} order by updated_at desc limit 100
  `;
  const conversations = await sql`
    select c.id, c.created_at,
      coalesce(json_agg(json_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at) order by m.created_at)
        filter (where m.id is not null), '[]') as messages
    from conversations c
    left join messages m on m.conversation_id=c.id
    where c.workspace_id=${workspace.id}
    group by c.id
    order by c.created_at desc limit 8
  `;
  return { workspace, goals, conversations };
}

export async function writeWorkspaceContext(workspaceId: string, context: Record<string, unknown>) {
  const { workspace } = await getAuthorizedWorkspace(workspaceId);
  const sql = db();
  await sql`
    update workspaces set context=${JSON.stringify(context)}::jsonb, updated_at=now()
    where id=${workspace.id}
  `;
  return { ...workspace, context };
}
