import handler from "vinext/server/app-router-entry";

type WorkerEnv = {
  HYPERDRIVE?: {
    connectionString: string;
  };
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    // Keep the existing application data layer intact while routing its DATABASE_URL
    // through Cloudflare Hyperdrive in production. Local development can continue to
    // use DATABASE_URL directly.
    if (env.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }

    return handler.fetch(request, env, ctx);
  },
};
