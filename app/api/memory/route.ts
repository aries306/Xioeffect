import { z } from "zod";
import { db } from "@/lib/db";
import { createMemory, retrieveContextualMemories } from "@/lib/memory";
import { getAuthorizedWorkspace } from "@/lib/workspace";

const createSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(2_000),
  category: z.string().trim().min(1).max(64).default("other"),
  confidence: z.number().int().min(5).max(100).optional(),
  relevance: z.number().int().min(0).max(100).optional(),
  scope: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  confirmed: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
    const query = url.searchParams.get("q") ?? "";
    const { workspace } = await getAuthorizedWorkspace(workspaceId);
    if (query) return Response.json({ memories: await retrieveContextualMemories(String(workspace.id), query, {}, 20) });
    const sql = db();
    const memories = await sql`
      select id, text, category, confidence, relevance, lifecycle_state, confirmed, scope, provenance, source, created_at, updated_at, last_confirmed_at, last_retrieved_at
      from memories where workspace_id=${workspace.id} and lifecycle_state in ('active','dormant')
      order by relevance desc, confidence desc, updated_at desc limit 100
    `;
    return Response.json({ memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load memories";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Memory access denied" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid memory request" }, { status: 400 });
    const { workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId);
    const memory = await createMemory({ ...parsed.data, workspaceId: String(workspace.id) });
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/access denied/i.test(message)) return Response.json({ error: message }, { status: 403 });
    return Response.json({ error: "Unable to create memory" }, { status: 500 });
  }
}
