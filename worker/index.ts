import handler from "vinext/server/app-router-entry";

type WorkerEnv = {
  // Injected by Cloudflare when the Worker serves static assets.
  ASSETS?: {
    fetch(request: Request): Promise<Response> | Response;
  };
  HYPERDRIVE?: {
    connectionString: string;
  };
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response> {
    // Keep the existing application data layer intact while routing its DATABASE_URL
    // through Cloudflare Hyperdrive in production. Local development can continue to
    // use DATABASE_URL directly.
    if (env.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
