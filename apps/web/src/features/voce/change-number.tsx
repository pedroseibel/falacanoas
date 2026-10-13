import { isBrazilianMobileE164, maskedPhone, maskPhoneBR, toE164BR } from "@fala/core";
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { devCode } from "@/features/auth/identity-api";
import { usePasskeySupport } from "@/features/auth/passkey-support";
import { authClient } from "@/lib/auth-client";
import { finishNumberChange, requestReauthCode, startNumberChange, type ChangeStart } from "@/server/lifecycle";
import { CodeField, DevCode } from "./code-field";
import { sendChangeCode, verifyChangeCode } from "./number-change-api";
import { passkeysQuery } from "./passkeys";

type Start = UseMutationResult<ChangeStart, Error, string | null>;

/**
 * "Trocar número" (DECISIONS round 18, Q20): re-authenticate (a code to the current number, a passkey,
 * or a sign-in moments ago), then a code to the new number. The new number goes only to the vault.
 * Without the old number or a passkey there's no way through: no manual recovery, a new account instead.
 */
export function ChangeNumber({ hint, onChanged }: { hint: string | null; onChanged: (hint: string) => void }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const start: Start = useMutation({ mutationFn: (code) => startNumberChange({ data: { code } }) });
  return (
    <>
      <Button
        variant="outline"
        className="justify-self-start"
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
          start.reset();
          start.mutate(null);
        }}
      >
        Trocar número
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <ChangeSteps
            key={round}
            hint={hint}
            start={start}
            onCancel={() => setOpen(false)}
            onDone={(next) => {
              setOpen(false);
              onChanged(next);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChangeSteps({
  hint,
  start,
  onCancel,
  onDone,
}: {
  hint: string | null;
  start: Start;
  onCancel: () => void;
  onDone: (hint: string) => void;
}) {
  const ticket = start.data?.ok ? start.data.ticket : null;
  if (ticket) return <NewNumber ticket={ticket} onCancel={onCancel} onDone={onDone} />;
  if (start.data && !start.data.ok && start.data.reauth)
    return <Reauth hint={hint} start={start} onCancel={onCancel} />;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Trocar o número</DialogTitle>
        <DialogDescription>
          {start.data && !start.data.ok
            ? start.data.error
            : start.isError
              ? "Não deu para começar agora."
              : "Um instante…"}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Fechar
        </Button>
      </DialogFooter>
    </>
  );
}

/** First, that it's really the account's owner: a code to the current number, or a passkey. */
function Reauth({ hint, start, onCancel }: { hint: string | null; start: Start; onCancel: () => void }) {
  // A passkey re-authenticates only if this account has one and this browser can use it.
  const supported = usePasskeySupport();
  const { data: keys } = useQuery(passkeysQuery);
  const passkeys = supported && Boolean(keys?.length);
  const [code, setCode] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const r = await requestReauthCode();
      if (!r.ok) throw new Error(r.error);
      return r;
    },
  });
  const withPasskey = useMutation({
    mutationFn: async () => {
      const r = await authClient.signIn.passkey();
      if (r?.error) throw new Error(r.error.message);
    },
    // A sign-in this recent counts: the app starts the change without a code.
    onSuccess: () => start.mutate(null),
  });
  const failed = start.data && !start.data.ok && !start.data.reauth ? start.data.error : null;
  const busy = start.isPending;

  if (!send.data)
    return (
      <>
        <DialogHeader>
          <DialogTitle>Primeiro, confirme que é você</DialogTitle>
          <DialogDescription>
            Vamos mandar um código para o número atual
            {hint && (
              <>
                , <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{hint}</span>
              </>
            )}
            .{passkeys && " Se já não tem esse número, use a sua passkey."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-caption text-pretty text-muted-foreground">
          {passkeys
            ? "Sem o número antigo e sem a passkey, não dá para trocar: entre com o número novo, numa conta nova."
            : "Sem o número antigo, não dá para trocar: entre com o número novo, numa conta nova."}
        </p>
        {(send.isError || withPasskey.isError) && (
          <p role="alert" className="text-caption text-signal-text">
            {send.isError ? send.error.message : "Não deu para usar a passkey. Tente de novo."}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          {passkeys && (
            <Button variant="outline" disabled={withPasskey.isPending || busy} onClick={() => withPasskey.mutate()}>
              {withPasskey.isPending || busy ? (
                <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound data-icon="inline-start" aria-hidden="true" />
              )}
              Usar passkey
            </Button>
          )}
          <Button disabled={send.isPending} onClick={() => send.mutate()}>
            {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
            Mandar código
          </Button>
        </DialogFooter>
      </>
    );

  const sent = send.data;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Primeiro, confirme que é você</DialogTitle>
        <DialogDescription>
          Mandamos 6 números para o WhatsApp de{" "}
          <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{sent.hint}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <CodeField
          id="troca-atual"
          value={code}
          onChange={setCode}
          onComplete={(c) => start.mutate(c)}
          error={failed}
          note="O código vale por 5 minutos."
          disabled={busy}
        />
        {sent.devCode && <DevCode code={sent.devCode} disabled={busy} onUse={() => start.mutate(sent.devCode)} />}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button disabled={code.length < 6 || busy} onClick={() => start.mutate(code)}>
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Continuar
        </Button>
      </DialogFooter>
    </>
  );
}

/** Then the new number, and its code, straight to the vault. */
function NewNumber({
  ticket,
  onCancel,
  onDone,
}: {
  ticket: string;
  onCancel: () => void;
  onDone: (hint: string) => void;
}) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [to, setTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const send = useMutation({
    mutationFn: (e164: string) => sendChangeCode(ticket, e164),
    onSuccess: (_, e164) => setTo(e164),
  });
  const shown = useMutation({ mutationFn: (e164: string) => devCode(e164) });
  const confirm = useMutation({
    mutationFn: async ({ e164, c }: { e164: string; c: string }) => {
      await verifyChangeCode(ticket, e164, c);
      const r = await finishNumberChange();
      if (!r.ok) throw new Error(r.error);
      return r.hint;
    },
    onSuccess: onDone,
    onError: () => setCode(""),
  });

  if (!to) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const e164 = toE164BR(value);
      if (!e164 || !isBrazilianMobileE164(e164)) return setInvalid(true);
      send.mutate(e164);
    };
    return (
      <form noValidate onSubmit={submit} className="grid gap-4">
        <DialogHeader>
          <DialogTitle>Qual é o número novo?</DialogTitle>
          <DialogDescription>
            Vamos mandar um código para ele. Depois da troca, você sai dos outros aparelhos, e as suas confirmações
            voltam a contar 72 horas depois, como para qualquer número novo.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={invalid || send.isError}>
          <FieldLabel htmlFor="troca-celular">Celular novo, com DDD</FieldLabel>
          <InputGroup variant="lg">
            <InputGroupAddon>
              <span className="font-mono text-ink-2">+55</span>
            </InputGroupAddon>
            <InputGroupInput
              id="troca-celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(51) 99999-9999"
              autoFocus
              value={value}
              aria-invalid={invalid || send.isError}
              aria-describedby="troca-celular-nota"
              onChange={(e) => {
                setInvalid(false);
                send.reset();
                setValue(maskPhoneBR(e.target.value));
              }}
            />
          </InputGroup>
          {invalid || send.isError ? (
            <FieldError id="troca-celular-nota">
              {invalid ? "Use um celular com DDD, como (51) 99999-9999." : send.error?.message}
            </FieldError>
          ) : (
            <FieldDescription id="troca-celular-nota">O número nunca aparece em público.</FieldDescription>
          )}
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={send.isPending}>
            {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
            Mandar código
          </Button>
        </DialogFooter>
      </form>
    );
  }

  const busy = confirm.isPending || confirm.isSuccess;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Digite o código</DialogTitle>
        <DialogDescription>
          Mandamos 6 números para o WhatsApp de{" "}
          <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{maskedPhone(to)}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <CodeField
          id="troca-novo"
          value={code}
          onChange={setCode}
          onComplete={(c) => confirm.mutate({ e164: to, c })}
          error={confirm.isError ? confirm.error.message : null}
          note="O código vale por 5 minutos."
          disabled={busy}
        />
        {import.meta.env.DEV &&
          (shown.data ? (
            <DevCode
              code={shown.data}
              disabled={busy}
              onUse={() => confirm.mutate({ e164: to, c: shown.data ?? "" })}
            />
          ) : (
            <Button size="sm" variant="outline" className="justify-self-start" onClick={() => shown.mutate(to)}>
              Ver código (ambiente de teste)
            </Button>
          ))}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button disabled={code.length < 6 || busy} onClick={() => confirm.mutate({ e164: to, c: code })}>
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Trocar número
        </Button>
      </DialogFooter>
    </>
  );
}
