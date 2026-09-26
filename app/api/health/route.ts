import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    app: "ok",
    database: "missing",
    clerk: process.env.CLERK_SECRET_KEY ? "configured" : "missing",
    aiGateway: process.env.AI_GATEWAY_API_KEY ? "configured" : "missing",
  };

  try {
    if (process.env.DATABASE_URL) {
      const sql = db();
      await sql`select 1 as ok`;
      checks.database = "ok";
    }
  } catch {
    checks.database = "error";
  }

  const healthy = checks.database === "ok";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "xio",
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
