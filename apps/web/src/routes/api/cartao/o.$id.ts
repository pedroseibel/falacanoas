import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { cardResponse, itemShareCard } from "@/server/share-cards";

/** A pin's share card (DECISIONS rounds 11 and 15), the og:image of /o/$id. */
export const Route = createFileRoute("/api/cartao/o/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const cards = env.CARDS;
        return cardResponse(
          request,
          () => itemShareCard(params.id, new URL(request.url).origin),
          cards ? (c) => cards.render(c) : null,
        );
      },
    },
  },
});
