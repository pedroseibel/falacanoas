import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { ItemDetail } from "@/features/item/item-detail";
import { setMapState } from "@/features/map/map-store";
import { cityQuery, itemQuery } from "@/lib/city";

export const Route = createFileRoute("/_app/_map/o/$id")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(itemQuery(params.id));
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
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
  const { data: city } = useSuspenseQuery(cityQuery);
  const item = city.items.find((i) => i.id === id);
  if (!item) return null;
  return <ItemDetail key={item.id} it={item} muni={canoas} viewer={city.viewer} now={new Date(city.now)} />;
}
