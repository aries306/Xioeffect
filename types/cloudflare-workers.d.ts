declare module "cloudflare:workers" {
  interface HyperdriveBinding {
    connectionString: string;
  }

  interface WorkersAiBinding {
    run(
      model: string,
      input: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      },
    ): Promise<{ response?: string }>;
  }

  export const env: {
    HYPERDRIVE?: HyperdriveBinding;
    AI?: WorkersAiBinding;
  };
}
