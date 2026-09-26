import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const preferencesSchema = z.object({
  learningEnabled: z.boolean().optional(),
  askBeforeMemory: z.boolean().optional(),
  tone: z.string().trim().min(1).max(80).optional(),
  detailLevel: z.string().trim().min(1).max(80).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "At least one preference is required" });

export async function GET() {
  try {
    const { id } = await requireUser();
    const sql = db();
    const rows = await sql`select learning_enabled, ask_before_memory, tone, detail_level, updated_at from preferences join users on users.id=preferences.user_id where users.clerk_user_id=${id} limit 1`;
    return Response.json({ preferences: rows[0] ?? { learning_enabled: true, ask_before_memory: true, tone: "Calm & confident", detail_level: "Balanced" } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load preferences";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Unable to load preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id } = await requireUser();
    const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid preferences" }, { status: 400 });
    const sql = db();
    const users = await sql`select id from users where clerk_user_id=${id} limit 1`;
    if (!users[0]) return Response.json({ error: "User profile not found" }, { status: 404 });
    const userId = String(users[0].id);
    const next = parsed.data;
    const rows = await sql`
      insert into preferences (user_id, learning_enabled, ask_before_memory, tone, detail_level)
      values (${userId}, coalesce(${next.learningEnabled ?? null}, true), coalesce(${next.askBeforeMemory ?? null}, true), coalesce(${next.tone ?? null}, "Calm & confident"), coalesce(${next.detailLevel ?? null}, "Balanced"))
      on conflict (user_id) do update set
        learning_enabled=coalesce(${next.learningEnabled ?? null}, preferences.learning_enabled),
        ask_before_memory=coalesce(${next.askBeforeMemory ?? null}, preferences.ask_before_memory),
        tone=coalesce(${next.tone ?? null}, preferences.tone),
        detail_level=coalesce(${next.detailLevel ?? null}, preferences.detail_level),
        updated_at=now()
      returning learning_enabled, ask_before_memory, tone, detail_level, updated_at
    `;
    return Response.json({ preferences: rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save preferences";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Unable to save preferences" }, { status: 500 });
  }
}