export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_AI_MODEL = "openai/gpt-6-luna";

export async function generateAiResponse(messages: AiMessage[]) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY is not configured");

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? DEFAULT_AI_MODEL,
      messages,
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI Gateway request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI Gateway returned no assistant content");
  return text;
}
