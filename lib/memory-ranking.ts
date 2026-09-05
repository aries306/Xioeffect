export type RankingInput = {
  text: string;
  scope: unknown;
  lifecycleState: "active" | "dormant";
  confidence: number;
  relevance: number;
  updatedAt: string;
};

export function scoreContextualMemory(memory: RankingInput, query: string, context: Record<string, unknown>, now = Date.now()) {
  const tokens = String(query).toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const contextTokens = JSON.stringify(context).toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const text = memory.text.toLowerCase();
  const scope = JSON.stringify(memory.scope ?? {}).toLowerCase();
  const lexical = tokens.reduce((score, token) => score + (text.includes(token) ? 3 : 0), 0);
  const contextual = contextTokens.reduce((score, token) => score + (scope.includes(token) ? 2 : 0), 0);
  const ageDays = Math.max(0, (now - new Date(memory.updatedAt).getTime()) / 86400000);
  const recency = 1 / (1 + ageDays / 30);
  const dormantPenalty = memory.lifecycleState === "dormant" ? 0.82 : 1;
  return (lexical + contextual + (memory.confidence / 100) * 2 + (memory.relevance / 100) * 2 + recency) * dormantPenalty;
}
