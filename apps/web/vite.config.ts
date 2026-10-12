import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 3100,
    strictPort: true,
    host: "127.0.0.1",
    allowedHosts: [".ts.net"],
  },
  plugins: [
    // The identity vault runs beside the app in development, reached through the VAULT service binding.
    cloudflare({ viteEnvironment: { name: "ssr" }, auxiliaryWorkers: [{ configPath: "../vault/wrangler.jsonc" }] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
