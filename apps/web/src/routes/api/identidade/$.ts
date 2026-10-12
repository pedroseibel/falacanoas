import { createFileRoute } from "@tanstack/react-router";
import { forwardToVault } from "@/server/vault";

/** The vault's auth gateway, reached through the app in development only (see forwardToVault). */
export const Route = createFileRoute("/api/identidade/$")({
  server: {
    handlers: {
      GET: ({ request }) => forwardToVault(request),
      POST: ({ request }) => forwardToVault(request),
    },
  },
});
