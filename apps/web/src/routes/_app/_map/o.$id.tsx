import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
import { ItemDetail } from "@/features/item/item-detail";
import { setMapState } from "@/features/map/map-store";
import { accountQuery, cityQuery, itemQuery, memberGate } from "@/lib/city";

export const Route = createFileRoute("/_app/_map/o/$id")({
  // A guest pin's tracking link: /o/ID?chave=… opens it while it waits for moderation.
  validateSearch: z.object({ chave: z.string().max(64).optional() }),
  loaderDeps: ({ search }) => ({ chave: search.chave ?? null }),
  loader: async ({ context, params, deps }) => {
    const item = await context.queryClient.ensureQueryData(itemQuery(params.id, deps.chave));
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.moderation
      ? [{ title: "Registro em análise · Fala, Canoas" }, { name: "robots", content: "noindex" }]
      : loaderData
        ? [
            { title: `${loaderData.title} · Fala, Canoas` },
            { name: "description", content: `${loaderData.days} dias em aberto. ${loaderData.text}` },
            { property: "og:title", content: `${loaderData.title} · ${loaderData.days} dias` },
            { property: "og:description", content: loaderData.text },
            ...(loaderData.photos[0] ? [{ property: "og:image", content: loaderData.photos[0].src }] : []),
          ]
        : [],
  }),
  onEnter: ({ params }) => setMapState({ selectedId: params.id, focusId: null }),
  onStay: ({ params }) => setMapState({ selectedId: params.id }),
  onLeave: () => setMapState({ selectedId: null }),
  component: ItemRoute,
});

function ItemRoute() {
  const { id } = Route.useParams();
  const { chave } = Route.useSearch();
  const { data: city } = useSuspenseQuery(cityQuery);
  // The item query carries the whole history; the city list doesn't.
  const { data: item } = useSuspenseQuery(itemQuery(id, chave ?? null));
  const { data: account } = useQuery(accountQuery);
  const navigate = useNavigate();
  if (!item) return null;
  const gate = memberGate(account ?? null);
  return (
    <ItemDetail
      key={item.id}
      it={item}
      muni={canoas}
      viewer={city.viewer}
      now={new Date(city.now)}
      member={gate === null}
      onSignIn={() => void navigate({ to: gate ?? "/entrar", search: { volta: `/o/${item.id}` } })}
    />
  );
}
