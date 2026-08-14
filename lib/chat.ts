import { z } from "zod";
export const chatRequestSchema = z.object({ message: z.string().trim().min(1).max(8_000), memoryIds: z.array(z.string().uuid()).max(40).default([]) });
export type ChatRequest = z.infer<typeof chatRequestSchema>;
