import handler from "vinext/server/app-router-entry";

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type WorkerEnv = {
  HYPERDRIVE?: {
    connectionString: string;
  };
};

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContextLike): Promise<Response> {
    // Keep the existing application data layer intact while routing its DATABASE_URL
    // through Cloudflare Hyperdrive in production. Local development can continue to
    // use DATABASE_URL directly.
    if (env.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }

    return (handler.fetch as unknown as (request: Request, env: WorkerEnv, ctx: ExecutionContextLike) => Promise<Response>)(request, env, ctx);
  },
};

export default worker;
