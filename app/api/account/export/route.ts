import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const { id: clerkUserId } = await requireUser();
    const sql = db();
    const users = await sql`select id, email, display_name, plan, created_at, deleted_at from users where clerk_user_id=${clerkUserId} limit 1`;
    if (!users[0]) return Response.json({ version: 1, exportedAt: new Date().toISOString(), user: null, data: {} });

    const userId = String(users[0].id);
    const [preferences, workspaces, goals, memories, conversations, events, subscriptions, researchRecords, nexusEvents, githubRepositories] = await Promise.all([
      sql`select learning_enabled, ask_before_memory, tone, detail_level, updated_at from preferences where user_id=${userId} limit 1`,
      sql`select w.id, w.name, w.context, w.created_at, w.updated_at, wm.role from workspaces w join workspace_members wm on wm.workspace_id=w.id where wm.user_id=${userId} order by w.created_at`,
      sql`select id, workspace_id, title, progress, status, created_at, updated_at from goals where user_id=${userId} order by created_at`,
      sql`select id, workspace_id, text, category, confidence, relevance, lifecycle_state, confirmed, scope, provenance, source, created_at, updated_at, last_confirmed_at, last_retrieved_at from memories where user_id=${userId} order by created_at`,
      sql`select id, workspace_id, created_at from conversations where user_id=${userId} order by created_at`,
      sql`select id, kind, metadata, occurred_at from events where user_id=${userId} order by occurred_at`,
      sql`select stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, updated_at from subscriptions where user_id=${userId} limit 1`,
      sql`select id, source_type, source_id, title, summary, content, provenance, confidence, status, created_at, updated_at from research_records where user_id=${clerkUserId} order by created_at`,
      sql`select id, research_id, event_type, payload, dedupe_key, created_at, delivered_at from nexus_ingest_events where user_id=${clerkUserId} order by created_at`,
      sql`select gr.id, gr.connection_id, gr.github_repo_id, gr.full_name, gr.name, gr.is_private, gr.default_branch, gr.html_url, gr.description, gr.pushed_at, gr.updated_at, gr.selected, gr.last_synced_at, gr.last_synced_commit, gr.sync_status, gr.sync_error from github_repositories gr join github_connections gc on gc.id=gr.connection_id where gc.user_id=${clerkUserId} order by gr.updated_at`,
    ]);

    const githubConnections = await sql`select github_user_id, github_login, scopes, access_token_expires_at, refresh_token_expires_at, created_at, updated_at from github_connections where user_id=${clerkUserId} limit 1`;
    const githubDocuments = await sql`select gd.id, gd.repository_id, gd.path, gd.blob_sha, gd.content, gd.content_hash, gd.size_bytes, gd.indexed_at from github_documents gd join github_repositories gr on gr.id=gd.repository_id join github_connections gc on gc.id=gr.connection_id where gc.user_id=${clerkUserId} order by gd.indexed_at`;
    const messageRows = await sql`select m.id, m.conversation_id, m.role, m.content, m.created_at from messages m join conversations c on c.id=m.conversation_id where c.user_id=${userId} order by m.created_at`;

    return Response.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      user: users[0],
      data: {
        preferences: preferences[0] ?? null,
        workspaces,
        goals,
        memories,
        conversations,
        messages: messageRows,
        events,
        subscriptions: subscriptions[0] ?? null,
        github: { connection: githubConnections[0] ?? null, repositories: githubRepositories, documents: githubDocuments },
        researchRecords,
        nexusEvents,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export account";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Account export failed" }, { status: 500 });
  }
}