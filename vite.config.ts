import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
  build: {
    minify: "esbuild",
  },
  environments: {
    client: { build: { minify: "esbuild" } },
    rsc: { build: { minify: "esbuild" } },
    ssr: { build: { minify: "esbuild" } },
  },
});
