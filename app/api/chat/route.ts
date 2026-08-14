import { chatRequestSchema } from "@/lib/chat";
export async function POST(request: Request) {
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  return Response.json({ error: "AI chat is not configured yet" }, { status: 503 });
}
