export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const AI_TIMEOUT_MS = 20_000;

export async function generateAiResponse(messages: AiMessage[]) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "openai/gpt-5.6-luna",
        messages,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`AI Gateway request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("AI Gateway returned no assistant content");
    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("AI Gateway request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}