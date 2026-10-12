import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { BairroPage } from "@/features/bairro/bairro-page";
import { accountQuery, cityQuery, memberGate, threadsQuery } from "@/lib/city";

export const Route = createFileRoute("/_app/bairro/$slug")({
  loader: async ({ context, params }) => {
    const bairro = canoas.neighborhoods.find((n) => n.slug === params.slug);
    if (!bairro) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(cityQuery),
      context.queryClient.ensureQueryData(threadsQuery(params.slug)),
    ]);
    return { name: bairro.name };
  },
  head: ({ loaderData }) => ({ meta: loaderData ? [{ title: `${loaderData.name} · Fala, Canoas` }] : [] }),
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
