import handler from "vinext/server/app-router-entry";

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type WorkerEnv = {
  ASSETS?: {
    fetch(request: Request): Promise<Response> | Response;
  };
  HYPERDRIVE?: {
    connectionString: string;
  };
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
  APP_ENV?: string;
};

const appFetch = handler.fetch as unknown as (
  request: Request,
  env: WorkerEnv,
  ctx: WorkerExecutionContext,
) => Promise<Response>;

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response> {
    // Keep the existing data layer compatible with local DATABASE_URL while
    // routing deployed requests through the environment's isolated Hyperdrive.
    if (env.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }

    return appFetch(request, env, ctx);
  },
};

export default worker;
