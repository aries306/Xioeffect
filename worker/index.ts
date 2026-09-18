import handler from "vinext/server/app-router-entry";

const worker = {
  async fetch(...args: Parameters<typeof handler.fetch>): Promise<Response> {
    return handler.fetch(...args);
  },
};

export default worker;
