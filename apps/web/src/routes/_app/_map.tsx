import { Outlet, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { useMemo } from "react";
import { MapPage } from "@/features/map/map-page";
import { setMapState } from "@/features/map/map-store";
import { MapSearchSchema, visibleItems, type MapSearch } from "@/features/map/selectors";
import { cityQuery } from "@/lib/city";
import type { getCity } from "@/server/data";

type City = Awaited<ReturnType<typeof getCity>>;
const syncVisible = (city: City | undefined, search: MapSearch) => {
  if (city) setMapState({ visible: visibleItems(city.items, search, canoas, city.viewer.location) });
};

export const Route = createFileRoute("/_app/_map")({
  validateSearch: MapSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(cityQuery),
  onEnter: ({ loaderData, search }) => syncVisible(loaderData, search),
  onStay: ({ loaderData, search }) => syncVisible(loaderData, search),
  component: MapRoute,
});

function MapRoute() {
  const { data: city } = useSuspenseQuery(cityQuery);
  const search = Route.useSearch();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const selectedId = typeof params.id === "string" ? params.id : null;
  const visible = useMemo(() => visibleItems(city.items, search, canoas, city.viewer.location), [city, search]);
  const setQuery = useDebouncedCallback(
    (patch: Partial<MapSearch>) => void navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }) }),
    { wait: 200 },
  );
  return (
    <MapPage
      muni={canoas}
      viewer={city.viewer}
      visible={visible}
      search={search}
      selectedId={selectedId}
      onSearch={(patch) =>
        "q" in patch ? setQuery(patch) : void navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }) })
      }
      onOpen={(id) => void navigate({ to: "/o/$id", params: { id }, search: (prev) => prev })}
      onClose={() => void navigate({ to: "/mapa", search: (prev) => prev })}
      detail={<Outlet />}
    />
  );
}
