import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { bairroShareCard, cardResponse } from "@/server/share-cards";

/** A bairro's share card (DECISIONS round 11), the og:image of /bairro/$slug. */
export const Route = createFileRoute("/api/cartao/bairro/$slug")({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const cards = env.CARDS;
        return cardResponse(request, () => bairroShareCard(params.slug), cards ? (c) => cards.render(c) : null);
      },
    },
  },
});
