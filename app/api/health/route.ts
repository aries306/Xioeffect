import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    app: "ok",
    database: "missing",
    schema: "missing",
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
          to_regclass('public.memories') as memories_table
      `;
      checks.schema = schema[0]?.users_table && schema[0]?.workspaces_table && schema[0]?.memories_table ? "ready" : "incomplete";
    }
  } catch {
    checks.database = "error";
    checks.schema = "unknown";
  }

  const healthy = checks.database === "ok" && checks.schema === "ready";
  return Response.json(
    { status: healthy ? "ok" : "degraded", service: "xio", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}