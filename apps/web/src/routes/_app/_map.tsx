import { Outlet, createFileRoute, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useDebouncer } from "@tanstack/react-pacer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { useMemo, useState } from "react";
import { MapPage } from "@/features/map/map-page";
import { setMapState } from "@/features/map/map-store";
import { pinIntent } from "@/lib/pin-intent";
import { MapSearchSchema, visibleItems, type MapSearch } from "@/features/map/selectors";
import { useMountEffect } from "@/hooks/use-mount-effect";
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
  const router = useRouter();
  // A pin about to be opened: its route (the panel's code, and the loader that starts its data).
  const [intent] = useState(() =>
    pinIntent(
      (id) => void router.preloadRoute({ to: "/o/$id", params: { id }, search: (prev) => prev }).catch(() => {}),
    ),
  );
  // The panel's code is its own chunk: fetch it once the page is idle, so a first tap with no hover
  // before it (a phone, a map pin) doesn't wait for it.
  useMountEffect(() => {
    const load = () => void router.loadRouteChunk(router.routesById["/_app/_map/o/$id"]);
    if ("requestIdleCallback" in window) {
      const handle = requestIdleCallback(load, { timeout: 3000 });
      return () => cancelIdleCallback(handle);
    }
    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  });
  const params = useParams({ strict: false });
  const selectedId = typeof params.id === "string" ? params.id : null;
  const visible = useMemo(() => visibleItems(city.items, search, canoas, city.viewer.location), [city, search]);
  const setSearch = (patch: Partial<MapSearch>) =>
    void navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }) });
  const typing = useDebouncer(setSearch, { wait: 200 });
  return (
    <MapPage
      muni={canoas}
      viewer={city.viewer}
      visible={visible}
      search={search}
      selectedId={selectedId}
      onSearch={(patch) => {
        if (!("q" in patch)) return setSearch(patch);
        if (patch.q) return typing.maybeExecute(patch);
        // Cleared: at once, and nothing typed just before lands after it.
        typing.cancel();
        setSearch(patch);
      }}
      onOpen={(id) => void navigate({ to: "/o/$id", params: { id }, search: (prev) => prev })}
      onClose={() => void navigate({ to: "/mapa", search: (prev) => prev })}
      intent={intent}
      detail={<Outlet />}
    />
  );
}
