import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
import { ItemDetail } from "@/features/item/item-detail";
import { PinNotFound } from "@/features/not-found/pin-not-found";
import { setMapState } from "@/features/map/map-store";
import { accountQuery, cityQuery, itemQuery, memberGate } from "@/lib/city";
import { itemShareMeta } from "@/lib/share-meta";

export const Route = createFileRoute("/_app/_map/o/$id")({
  // A guest pin's tracking link: /o/ID?chave=… opens it while it waits for moderation.
  validateSearch: z.object({ chave: z.string().max(64).optional() }),
  loaderDeps: ({ search }) => ({ chave: search.chave ?? null }),
  loader: async ({ context, params, deps }) => {
    // Not shaped like a code ("/o/ab", "/o/../x"): nothing to look up.
    if (!/^[A-Za-z0-9]{4,12}$/.test(params.id)) throw notFound();
    const item = await context.queryClient.ensureQueryData(itemQuery(params.id, deps.chave));
    if (!item) throw notFound();
    return item;
  },
  // A shared pin gets its card (rounds 11 and 15); one in moderation, or refused, stays out of previews.
  head: ({ loaderData, match }) =>
    loaderData?.moderation
      ? {
          meta: [
            {
              title: `Registro ${loaderData.moderation === "pending" ? "em análise" : "não publicado"} · Fala, Canoas`,
            },
            { name: "robots", content: "noindex" },
          ],
        }
      : loaderData
        ? itemShareMeta(loaderData, canoas)
        : {
            meta: [
              { title: `${match.status === "notFound" ? "Registro não encontrado" : "Registro"} · Fala, Canoas` },
              { name: "robots", content: "noindex" },
            ],
          },
  onEnter: ({ params }) => setMapState({ selectedId: params.id, focusId: null }),
  onStay: ({ params }) => setMapState({ selectedId: params.id }),
  onLeave: () => setMapState({ selectedId: null }),
  component: ItemRoute,
  notFoundComponent: ItemNotFound,
});

function ItemNotFound() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return <PinNotFound code={id} onClose={() => void navigate({ to: "/mapa", search: (prev) => prev })} />;
}

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
      trackingKey={chave ?? null}
    />
  );
}
