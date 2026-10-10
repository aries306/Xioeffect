import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    app: "ok",
    database: "missing",
    schema: "missing",
    memoryFabric: "missing",
    clerk: process.env.CLERK_SECRET_KEY ? "configured" : "missing",
    aiGateway: process.env.AI_GATEWAY_API_KEY ? "configured" : "missing",
  };

  try {
    if (process.env.DATABASE_URL) {
      const sql = db();
      await sql`select 1 as ok`;
      checks.database = "ok";
      const schema = await sql`
        select
          to_regclass('public.users') as users_table,
          to_regclass('public.workspaces') as workspaces_table,
          to_regclass('public.memories') as memories_table,
          to_regclass('public.memory_relations') as memory_relations_table,
          to_regclass('public.memory_events') as memory_events_table,
          exists(select 1 from information_schema.columns where table_schema='public' and table_name='memories' and column_name='last_evaluated_at') as has_last_evaluated_at,
          exists(select 1 from information_schema.columns where table_schema='public' and table_name='memories' and column_name='evaluation') as has_evaluation_column
      `;
      checks.schema = schema[0]?.users_table && schema[0]?.workspaces_table && schema[0]?.memories_table ? "ready" : "incomplete";
      checks.memoryFabric = schema[0]?.memory_relations_table && schema[0]?.memory_events_table && schema[0]?.has_last_evaluated_at && schema[0]?.has_evaluation_column ? "ready" : "incomplete";
    }
  } catch {
    checks.database = "error";
    checks.schema = "unknown";
  }

  const healthy = checks.database === "ok" && checks.schema === "ready" && checks.memoryFabric === "ready";
  return Response.json(
    { status: healthy ? "ok" : "degraded", service: "xio", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}