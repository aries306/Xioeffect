export type MemoryCandidate = {
  text: string;
  category: "goal" | "challenge" | "working_style" | "preference" | "achievement" | "other";
  confidence: number;
  relevance: number;
  source: "conversation";
};

const patterns: Array<{ re: RegExp; category: MemoryCandidate["category"]; label: string }> = [
  { re: /\bmy goal is\b/i, category: "goal", label: "Goal" },
  { re: /\bi(?:'m| am) working toward\b/i, category: "goal", label: "Goal" },
  { re: /\bi keep (?:putting off|avoiding|struggling with)\b/i, category: "challenge", label: "Challenge" },
  { re: /\bi(?:'m| am) good at\b/i, category: "achievement", label: "Strength" },
  { re: /\bi work best when\b/i, category: "working_style", label: "Working style" },
  { re: /\bi prefer\b/i, category: "preference", label: "Preference" },
];

export function extractMemoryCandidates(text: string): MemoryCandidate[] {
  return patterns.flatMap(({ re, category, label }) => {
    const match = re.exec(text);
    if (!match || match.index === undefined) return [];
    const remainder = text.slice(match.index + match[0].length).replace(/^[\s,:;-]+/, "").trim();
    const sentence = remainder.split(/[.!?\n]/)[0].trim().slice(0, 180);
    if (sentence.length < 3) return [];
    return [{ text: `${label}: ${sentence}`, category, confidence: 45, relevance: 60, source: "conversation" }];
  }).slice(0, 2);
}
