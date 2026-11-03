import handler from "vinext/server/app-router-entry";

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type WorkerEnv = {
  HYPERDRIVE?: {
    connectionString: string;
  };
  AI?: {
    run(model: string, input: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; temperature?: number; max_tokens?: number }): Promise<{ response?: string }>;
  };
};

type ZunaRuntime = typeof globalThis & {
  __ZUNA_DATABASE_URL?: string;
  __ZUNA_DB_SOURCE?: string;
  __ZUNA_AI?: NonNullable<WorkerEnv["AI"]>;
};

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContextLike): Promise<Response> {
    // Keep the existing application data layer intact while routing its DATABASE_URL
    // through Cloudflare Hyperdrive in production. Local development can continue to
    // use DATABASE_URL directly.
    const runtime = globalThis as ZunaRuntime;
    if (env.HYPERDRIVE?.connectionString) {
      runtime.__ZUNA_DATABASE_URL = env.HYPERDRIVE.connectionString;
      runtime.__ZUNA_DB_SOURCE = "Cloudflare Hyperdrive";
    }
    if (env.AI) runtime.__ZUNA_AI = env.AI;

    return (handler.fetch as unknown as (request: Request, env: WorkerEnv, ctx: ExecutionContextLike) => Promise<Response>)(request, env, ctx);
  },
};

export default worker;
