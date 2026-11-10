import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { BairroPage } from "@/features/bairro/bairro-page";
import { BairroNotFound } from "@/features/not-found/bairro-not-found";
import { findBairro } from "@/features/not-found/not-found-model";
import { useGo } from "../-links";
import { isOpen, isOverDeadline } from "@fala/core";
import { threadsQuery } from "@/features/forum/queries";
import { accountQuery, memberGate } from "@/lib/account";
import { cityQuery } from "@/lib/city";
import { bairroShareMeta } from "@/lib/share-meta";

export const Route = createFileRoute("/_app/bairro/$slug")({
  loader: async ({ context, params }) => {
    const bairro = canoas.neighborhoods.find((n) => n.slug === params.slug);
    if (!bairro) {
      // The same bairro written differently ("São José", "mathias velho"): straight to it.
      const { exact } = findBairro(params.slug, canoas.neighborhoods);
      if (exact) throw redirect({ to: "/bairro/$slug", params: { slug: exact.slug }, replace: true });
      throw notFound();
    }
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
      overdue: open.filter((i) => isOverDeadline(i, canoas.deadlineDays)).length,
      demo: mine.some((i) => i.demo),
    };
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? bairroShareMeta(loaderData, canoas)
      : {
          meta: [
            { title: `${match.status === "notFound" ? "Bairro não encontrado" : "Bairro"} · Fala, Canoas` },
            { name: "robots", content: "noindex" },
          ],
        },
  component: BairroRoute,
  notFoundComponent: BairroMissing,
});

function BairroMissing() {
  const { slug } = Route.useParams();
  return <BairroNotFound muni={canoas} slug={slug} go={useGo()} />;
}

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
