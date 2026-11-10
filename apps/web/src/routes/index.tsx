import { SignupChannelSchema, siteUrl } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { LandingPage } from "@/features/landing/landing-page";
import { queueQuery } from "@/features/landing/queries";

const SITE = `${siteUrl(canoas)}/`;
const TITLE = "Fala, Canoas · o que está quebrado na sua rua, contado em dias";
const DESCRIPTION =
  "Mapa independente e de código aberto para registrar problemas urbanos de Canoas (RS) com foto e acompanhar, em dias, quanto tempo levam para ser resolvidos. Entre na fila do seu bairro.";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    /** Bairro from a shared link. Unknown slugs are ignored. */
    b: z.string().optional().catch(undefined),
    canal: SignupChannelSchema.optional().catch(undefined),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(queueQuery),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "color-scheme", content: "light dark" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Fala, Canoas" },
      { property: "og:title", content: "Fala, Canoas: o que está quebrado na sua rua, contado em dias" },
      {
        property: "og:description",
        content: "Um mapa independente de Canoas. Cada bairro abre quando a fila enche. Coloque o seu.",
      },
      { property: "og:url", content: SITE },
      { property: "og:image", content: `${SITE}og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Fala, Canoas: mapa dos 18 bairros de Canoas e a frase: o que está quebrado na sua rua, contado em dias.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE }],
  }),
  component: Landing,
});

function Landing() {
  const { data } = useSuspenseQuery(queueQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const neighborhood = canoas.neighborhoods.some((n) => n.slug === search.b) ? (search.b ?? "") : "";
  return (
    <LandingPage
      muni={canoas}
      confirmed={data.confirmed}
      initial={{ neighborhood, channel: search.canal ?? "whatsapp" }}
      onBairroInUrl={(slug) =>
        void navigate({
          search: (prev) => ({ ...prev, b: slug || undefined }),
          replace: true,
          resetScroll: false,
          hashScrollIntoView: false,
        })
      }
    />
  );
}
