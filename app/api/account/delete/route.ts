import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { id: clerkUserId } = await requireUser();
    const body = await request.json().catch(() => null) as { confirm?: string } | null;
    if (body?.confirm !== "DELETE") return Response.json({ error: "Type DELETE to confirm account data deletion" }, { status: 400 });

    const sql = db();
    await sql`delete from nexus_ingest_events where user_id=${clerkUserId}`;
    await sql`delete from research_records where user_id=${clerkUserId}`;
    await sql`delete from github_connections where user_id=${clerkUserId}`;
    const deleted = await sql`delete from users where clerk_user_id=${clerkUserId} returning id`;

    return Response.json({ deleted: true, internalUserDataRemoved: Boolean(deleted[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete account data";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Account deletion failed" }, { status: 500 });
  }
}