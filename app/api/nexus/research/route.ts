import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const sql = db();
  const records = await sql`
    select id, source_type, source_id, title, summary, content, provenance, confidence, status, created_at, updated_at
    from research_records
    where user_id = ${user.id}
    order by created_at desc
    limit 200
  `;
  return Response.json({ records });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const eventType = typeof body.eventType === "string" ? body.eventType : "research.github.document";
  const sql = db();
  const rows = await sql`
    insert into nexus_ingest_events (user_id, research_id, event_type, payload)
    select ${user.id}, id, ${eventType}, ${JSON.stringify(body.payload ?? {})}::jsonb
    from research_records
    where user_id = ${user.id} and id = ${body.researchId}
    returning id, research_id, event_type, payload, created_at
  `;
  if (!rows[0]) return Response.json({ error: "Research record not found" }, { status: 404 });
  return Response.json({ event: rows[0] }, { status: 201 });
}
