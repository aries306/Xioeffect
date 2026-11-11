import handler from "vinext/server/app-router-entry";

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type WorkerEnv = {
  HYPERDRIVE?: { connectionString: string };
  AI?: {
    run(
      model: string,
      input: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      },
    ): Promise<{ response?: string }>;
  };
};

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContextLike): Promise<Response> {
    return (handler.fetch as unknown as (
      request: Request,
      env: WorkerEnv,
      ctx: ExecutionContextLike,
    ) => Promise<Response>)(request, env, ctx);
  },
};

export default worker;
