import { RequesterSchema } from "@fala/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ReturnPathSchema, returnPath } from "@/features/auth/auth-search";
import { DataRequestPage } from "@/features/legal/data-request-page";
import { accountQuery } from "@/lib/city";
import { getAuthConfig } from "@/server/account";
import { useBackLink } from "./-auth-links";

const SearchSchema = z.object({
  volta: ReturnPathSchema.optional().catch(undefined),
  /** Who is asking, when the link already knows (an item page's "Você aparece aqui?"). */
  quem: RequesterSchema.optional().catch(undefined),
  registro: z.string().max(300).optional().catch(undefined),
});

export const Route = createFileRoute("/privacidade_/pedido")({
  validateSearch: SearchSchema,
  loader: async ({ context }) => {
    const [account, config] = await Promise.all([context.queryClient.ensureQueryData(accountQuery), getAuthConfig()]);
    return { signedIn: Boolean(account && !account.guest && account.phoneVerified), ...config };
  },
  head: () => ({ meta: [{ title: "Pedido sobre os seus dados · Fala, Canoas" }] }),
  component: PedidoRoute,
});

function PedidoRoute() {
  const search = Route.useSearch();
  const { signedIn, turnstileSiteKey } = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <DataRequestPage
      back={useBackLink(returnPath(search))}
      signedIn={signedIn}
      turnstileSiteKey={turnstileSiteKey}
      initial={{ requester: search.quem, item: search.registro }}
      onDownload={() => void navigate({ to: "/voce" })}
    />
  );
}
