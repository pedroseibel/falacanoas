import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { BairroPage } from "@/features/bairro/bairro-page";
import { isOpen } from "@fala/core";
import { accountQuery, cityQuery, memberGate, threadsQuery } from "@/lib/city";
import { bairroShareMeta } from "@/lib/share-meta";

export const Route = createFileRoute("/_app/bairro/$slug")({
  loader: async ({ context, params }) => {
    const bairro = canoas.neighborhoods.find((n) => n.slug === params.slug);
    if (!bairro) throw notFound();
    const [city] = await Promise.all([
      context.queryClient.ensureQueryData(cityQuery),
      context.queryClient.ensureQueryData(threadsQuery(params.slug)),
    ]);
    // What the shared link says, counted as on the page: open occurrences, and those past the deadline.
    const mine = city.items.filter((i) => i.neighborhood === params.slug && i.kind === "occurrence");
    const open = mine.filter(isOpen);
    return {
      name: bairro.name,
      slug: params.slug,
      open: open.length,
      overdue: open.filter((i) => i.days > canoas.deadlineDays).length,
      demo: mine.some((i) => i.demo),
    };
  },
  head: ({ loaderData }) => (loaderData ? bairroShareMeta(loaderData, canoas) : {}),
  component: BairroRoute,
});

function BairroRoute() {
  const { slug } = Route.useParams();
  const { data: city } = useSuspenseQuery(cityQuery);
  const { data: threads } = useSuspenseQuery(threadsQuery(slug));
  const { data: account } = useQuery(accountQuery);
  const navigate = useNavigate();
  const gate = memberGate(account ?? null);
  return (
    <BairroPage
      key={slug}
      slug={slug}
      items={city.items}
      threads={threads}
      muni={canoas}
      onBairro={(s) => void navigate({ to: "/bairro/$slug", params: { slug: s } })}
      onOpen={(id) => void navigate({ to: "/o/$id", params: { id } })}
      member={gate === null}
      onSignIn={() => void navigate({ to: gate ?? "/entrar", search: { volta: `/bairro/${slug}` } })}
    />
  );
}
