import { ITEM_ID, itemPath } from "@fala/core";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
import { ItemDetail } from "@/features/item/item-detail";
import { PinNotFound } from "@/features/not-found/pin-not-found";
import { setMapState } from "@/features/map/map-store";
import { prefetchPin } from "@/features/item/queries";
import { accountQuery, memberGate } from "@/lib/account";
import { cityQuery, itemQuery } from "@/lib/city";
import { itemShareMeta } from "@/lib/share-meta";

export const Route = createFileRoute("/_app/_map/o/$id")({
  // A guest pin's tracking link: /o/ID?chave=… opens it while it waits for moderation.
  validateSearch: z.object({ chave: z.string().max(64).optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ chave: search.chave ?? null }),
  loader: async ({ context, params, deps }) => {
    // Not shaped like a code ("/o/ab", "/o/../x"): nothing to look up.
    if (!ITEM_ID.test(params.id)) throw notFound();
    // Opened from the map or a list, the pin is already in the city's list: the panel draws from that
    // copy at once while the full item (history, conversation) loads beside it. A first load renders
    // on the server, complete, and a pin outside the list (one in moderation) waits for its own.
    if (typeof document !== "undefined") {
      prefetchPin(context.queryClient, params.id);
      const listed = deps.chave
        ? undefined
        : context.queryClient.getQueryData(cityQuery.queryKey)?.items.find((i) => i.id === params.id);
      if (listed) return listed;
    }
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
  // The item query carries the whole history; the city list's copy (the loader's, when it had one)
  // stands in until it arrives.
  const loaded = Route.useLoaderData();
  const { data: item, isPlaceholderData } = useQuery({ ...itemQuery(id, chave ?? null), placeholderData: loaded });
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
      onSignIn={() => void navigate({ to: gate ?? "/entrar", search: { volta: itemPath(item.id) } })}
      trackingKey={chave ?? null}
      historyPending={isPlaceholderData}
    />
  );
}
