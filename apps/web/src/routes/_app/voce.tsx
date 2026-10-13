import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { toast } from "sonner";
import { turnOffPush } from "@/features/voce/push-device";
import { VocePage } from "@/features/voce/voce-page";
import { authClient } from "@/lib/auth-client";
import { accountQuery, cityQuery } from "@/lib/city";
import { useBackLink } from "../-auth-links";

export const Route = createFileRoute("/_app/voce")({
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(cityQuery), context.queryClient.ensureQueryData(accountQuery)]),
  head: () => ({ meta: [{ title: "Você · Fala, Canoas" }] }),
  component: VoceRoute,
});

function VoceRoute() {
  const { data: city } = useSuspenseQuery(cityQuery);
  const { data: account } = useSuspenseQuery(accountQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // A real link (new tab works); a plain click stays in the app.
  const request = useBackLink("/privacidade/pedido?volta=%2Fvoce");
  return (
    <VocePage
      account={account}
      muni={canoas}
      items={city.items}
      onOpen={(id) => void navigate({ to: "/o/$id", params: { id } })}
      onSignIn={() => void navigate({ to: "/entrar", search: { volta: "/voce" } })}
      onPickNick={() => void navigate({ to: "/bem-vindo", search: { volta: "/voce" } })}
      onModerate={() => void navigate({ to: "/moderar" })}
      requestPath={request.href}
      onRequest={request.onNavigate}
      onNumberChanged={(hint) => {
        void queryClient.invalidateQueries({ queryKey: accountQuery.queryKey });
        toast(`Número trocado para ${hint}. Você saiu dos outros aparelhos.`);
      }}
      onClosed={() => {
        queryClient.setQueryData(accountQuery.queryKey, null);
        void queryClient.invalidateQueries();
        void navigate({ to: "/mapa", replace: true });
        toast("Conta encerrada. Obrigado por cuidar do bairro.");
      }}
      onSignOut={() =>
        // This device stops receiving the account's notices before the session ends.
        void turnOffPush()
          .catch(() => undefined)
          .then(() => authClient.signOut())
          .then(() => {
            queryClient.setQueryData(accountQuery.queryKey, null);
            toast("Você saiu.");
          })
      }
    />
  );
}
