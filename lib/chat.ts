import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  workspaceId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const feedbackRequestSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  memoryId: z.string().uuid(),
  signal: z.enum(["confirm", "contradict", "useful", "not_useful", "reactivate", "supersede", "dismiss"]),
  note: z.string().trim().max(2_000).optional(),
  recommendationOutcomeId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
