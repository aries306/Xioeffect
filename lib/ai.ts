import { env } from "cloudflare:workers";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

const WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";

export async function generateAiResponse(messages: AiMessage[]) {
  if (!env.AI) {
    throw new Error("Cloudflare Workers AI binding is not configured for this deployment.");
  }

  const result = await env.AI.run(WORKERS_AI_MODEL, {
    messages,
    temperature: 0.2,
    max_tokens: 1200,
  });

  const text = result.response?.trim();
  if (!text) throw new Error("Cloudflare Workers AI returned no assistant content.");
  return text;
}
