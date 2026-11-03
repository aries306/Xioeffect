export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

type WorkersAiBinding = {
  run(
    model: string,
    input: {
      messages: AiMessage[];
      temperature?: number;
      max_tokens?: number;
    },
  ): Promise<{ response?: string }>;
};

const WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";

export async function generateAiResponse(messages: AiMessage[]) {
  const binding = (globalThis as typeof globalThis & { __ZUNA_AI?: WorkersAiBinding }).__ZUNA_AI;
  if (!binding) {
    throw new Error("Cloudflare Workers AI binding is not configured for this deployment.");
  }

  const result = await binding.run(WORKERS_AI_MODEL, {
    messages,
    temperature: 0.2,
    max_tokens: 1200,
  });

  const text = result.response?.trim();
  if (!text) throw new Error("Cloudflare Workers AI returned no assistant content.");
  return text;
}
