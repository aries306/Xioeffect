import { getAuthorizedWorkspace, readWorkspaceState, writeWorkspaceContext } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? undefined;
    const { workspace } = await getAuthorizedWorkspace(workspaceId);
    return Response.json(await readWorkspaceState(String(workspace.id)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workspace";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Workspace access denied" }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { workspaceId?: string; context?: Record<string, unknown> } | null;
    if (!body?.context || typeof body.context !== "object" || Array.isArray(body.context)) {
      return Response.json({ error: "context must be an object" }, { status: 400 });
    }
    const { workspace } = await getAuthorizedWorkspace(body.workspaceId);
    return Response.json({ workspace: await writeWorkspaceContext(String(workspace.id), body.context) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save workspace";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Workspace access denied" }, { status: 403 });
  }
}
