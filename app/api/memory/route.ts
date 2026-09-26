import { z } from "zod";
import { db } from "@/lib/db";
import { applyMemoryFeedback, createMemory, retrieveContextualMemories, updateMemory } from "@/lib/memory";
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
    const lifecycle = url.searchParams.get("lifecycle");
    const { workspace } = await getAuthorizedWorkspace(workspaceId);
    if (query) return Response.json({ memories: await retrieveContextualMemories(String(workspace.id), query, {}, 20) });
    const sql = db();
    const memories = await sql`
      select id, text, category, confidence, relevance, lifecycle_state, confirmed, scope, provenance, source, created_at, updated_at, last_confirmed_at, last_retrieved_at
      from memories where workspace_id=${workspace.id} and (${lifecycle ?? null}::text is null or lifecycle_state=${lifecycle ?? null}::text)
      order by relevance desc, confidence desc, updated_at desc limit 100
    `;
    return Response.json({ memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load memories";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Memory access denied" }, { status: 403 });
  }

}

const updateSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  memoryId: z.string().uuid(),
  text: z.string().trim().min(1).max(2_000).optional(),
  category: z.string().trim().min(1).max(64).optional(),
  scope: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid memory update" }, { status: 400 });
    const { workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId, ["owner", "editor"]);
    return Response.json({ memory: await updateMemory({ ...parsed.data, workspaceId: String(workspace.id) }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/not found|access denied/i.test(message)) return Response.json({ error: message }, { status: 404 });
    return Response.json({ error: "Unable to update memory" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = z.object({ workspaceId: z.string().uuid().optional(), memoryId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid memory archive request" }, { status: 400 });
    const { workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId, ["owner", "editor"]);
    return Response.json({ memory: await applyMemoryFeedback({ workspaceId: String(workspace.id), memoryId: parsed.data.memoryId, signal: "archive" }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/not found|access denied/i.test(message)) return Response.json({ error: message }, { status: 404 });
    return Response.json({ error: "Unable to archive memory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid memory request" }, { status: 400 });
    const { workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId, ["owner", "editor"]);
    const memory = await createMemory({ ...parsed.data, workspaceId: String(workspace.id) });
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/access denied/i.test(message)) return Response.json({ error: message }, { status: 403 });
    return Response.json({ error: "Unable to create memory" }, { status: 500 });
  }
}
