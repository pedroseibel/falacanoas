import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeAccount, requestReauthCode } from "@/server/lifecycle";
import { CodeField, DevCode } from "./code-field";

/**
 * "Encerrar conta" (DECISIONS round 18, Q26): what stays and what goes, then a code to the number on
 * the account, then the closing. Keyed by the caller, so each opening starts at the first step.
 */
export function CloseAccount({ onClosed }: { onClosed: () => void }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <Button
        variant="outline"
        className="justify-self-start"
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        Encerrar conta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <CloseSteps key={round} onCancel={() => setOpen(false)} onClosed={onClosed} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CloseSteps({ onCancel, onClosed }: { onCancel: () => void; onClosed: () => void }) {
  const [code, setCode] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const r = await requestReauthCode();
      if (!r.ok) throw new Error(r.error);
      return r;
    },
  });
  const close = useMutation({
    mutationFn: async (c: string) => {
      const r = await closeAccount({ data: { code: c } });
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: onClosed,
    onError: () => setCode(""),
  });
  const sent = send.data;

  if (!sent)
    return (
      <>
        <DialogHeader>
          <DialogTitle>Encerrar a sua conta?</DialogTitle>
          <DialogDescription>Antes, veja o que fica e o que sai.</DialogDescription>
        </DialogHeader>
        <ul className="grid list-disc gap-2 pl-4.5 text-sm leading-relaxed text-ink-2 marker:text-muted-foreground">
          <li>
            O que você publicou continua no mapa, como parte da história do bairro, sem ligação com a sua conta. O
            apelido fica nos registros e não passa para outra pessoa.
          </li>
          <li>
            Apagamos o seu perfil, os lugares que você acompanha e as suas passkeys. Você sai em todos os aparelhos.
          </li>
          <li>
            O número e os registros de acesso ficam guardados por 6 meses, como pede o Marco Civil da Internet, e depois
            são apagados.
          </li>
          <li>Para voltar, você cria uma conta nova, do zero.</li>
        </ul>
        {send.isError && (
          <p role="alert" className="text-caption text-destructive">
            {send.error.message}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={send.isPending} onClick={() => send.mutate()}>
            {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
            Mandar código
          </Button>
        </DialogFooter>
      </>
    );

  const busy = close.isPending || close.isSuccess;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirme que é você</DialogTitle>
        <DialogDescription>
          Mandamos 6 números para o WhatsApp de{" "}
          <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{sent.hint}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <CodeField
          id="encerrar"
          value={code}
          onChange={setCode}
          error={close.isError ? close.error.message : null}
          note="Depois de encerrar, não dá para desfazer."
          disabled={busy}
        />
        {sent.devCode && <DevCode code={sent.devCode} disabled={busy} onUse={() => setCode(sent.devCode ?? "")} />}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="destructive" disabled={code.length < 6 || busy} onClick={() => close.mutate(code)}>
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Encerrar conta
        </Button>
      </DialogFooter>
    </>
  );
}
