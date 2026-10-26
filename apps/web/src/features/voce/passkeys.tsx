import { localStamp } from "@fala/core";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePasskeySupport } from "@/features/auth/passkey-support";
import { authClient } from "@/lib/auth-client";

const passkeysKey = ["passkeys"];

/** The account's passkeys (Better Auth's list), shared with the number change's re-authentication. */
export const passkeysQuery = queryOptions({
  queryKey: passkeysKey,
  queryFn: async () => {
    const r = await authClient.passkey.listUserPasskeys();
    if (r.error) throw new Error(r.error.message);
    return r.data ?? [];
  },
});

/**
 * Passkeys (DECISIONS round 18, Q15 and Q26): optional, after the first phone sign-in. The phone stays
 * the account's link; a passkey is how a dormant account reopens once its number may have been reused.
 */
export function Passkeys({ nick, timezone }: { nick: string | null; timezone: string }) {
  const queryClient = useQueryClient();
  const supported = usePasskeySupport();
  const list = useQuery(passkeysQuery);
  const add = useMutation({
    mutationFn: async () => {
      // The name is what the phone's passkey manager shows for this account: the apelido, never the
      // account's internal e-mail.
      const r = await authClient.passkey.addPasskey({ name: nick ?? "Fala, Canoas" });
      if (r?.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: passkeysKey });
      toast("Passkey criada. Da próxima vez, entre com ela.");
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await authClient.passkey.deletePasskey({ id });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: passkeysKey }),
  });
  const passkeys = list.data ?? [];

  return (
    <section aria-labelledby="pk-t" className="grid gap-2.5">
      <h3 id="pk-t" className="text-sm font-semibold">
        Passkeys
      </h3>
      {passkeys.length === 0 && !list.isPending && (
        <p className="text-sm text-pretty text-ink-2">
          Entre com a digital ou o bloqueio da tela, sem esperar código. Depois de 180 dias sem entrar, só a passkey
          reabre esta conta, porque números de celular voltam a ser usados.
        </p>
      )}
      {passkeys.length > 0 && (
        <ul className="grid">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 border-b border-hairline py-2 text-sm last:border-b-0">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">
                Passkey
                <small className="block text-xs text-muted-foreground tabular-nums">
                  criada em {localStamp(new Date(p.createdAt), timezone).split(" · ")[0]}
                  {p.backedUp && " · sincronizada entre os seus aparelhos"}
                </small>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover a passkey criada em ${localStamp(new Date(p.createdAt), timezone).split(" · ")[0]}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(p.id)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <Button variant="outline" className="justify-self-start" disabled={add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <KeyRound data-icon="inline-start" />
          )}
          {passkeys.length ? "Criar outra neste aparelho" : "Criar passkey neste aparelho"}
        </Button>
      ) : (
        <p className="text-caption text-muted-foreground">Este navegador não aceita passkeys.</p>
      )}
      {add.isError && (
        <p role="alert" className="text-caption text-destructive">
          Não deu para criar a passkey. Tente de novo.
          {import.meta.env.DEV && " No ambiente de teste, passkeys só funcionam no endereço da tailnet."}
        </p>
      )}
    </section>
  );
}
