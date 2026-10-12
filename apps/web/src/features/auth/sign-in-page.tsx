import { isBrazilianMobileE164, maskPhoneBR, maskedPhone, toE164BR } from "@fala/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { KeyRound, Loader2, MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { accountQuery } from "@/lib/city";
import { useHydrated } from "@/lib/use-hydrated";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { getAccount, type Account } from "@/server/account";
import { AuthFrame, AuthHead, type BackLink } from "./auth-frame";
import { usePasskeySupport } from "./passkey-support";
import { devCode, requestCode, SendError, signInWithCode } from "./identity-api";
import { SEND_CODE_ACTION, SEND_FAILURE_MESSAGE } from "./send-code";
import { textLink } from "@/features/landing/bits";
import { StepRuler } from "./step-ruler";
import { TurnstileUnavailable, useTurnstile } from "./turnstile";

const SLOTS = [0, 1, 2, 3, 4, 5];
/** Seconds before "Mandar de novo" unlocks. */
const RESEND_AFTER = 30;
/** How long the ruler takes to run to the end before the page hands back. */
const FINISH_MS = 700;

type GetToken = () => Promise<string>;

/** Asks Turnstile for a fresh token, then asks the vault for the code with it (checked there with Siteverify). */
async function sendCode(e164: string, token: GetToken) {
  const captcha = await token().catch((e: unknown) => {
    throw new SendError(e instanceof TurnstileUnavailable ? "robot" : "send");
  });
  await requestCode(e164, captcha);
  return e164;
}

const failureOf = (e: Error | null) => (e instanceof SendError ? e.failure : "send");

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * /entrar: a Brazilian mobile, then the 6-digit code sent to its WhatsApp. `onDone` receives the
 * account; the route sends first-timers on to /bem-vindo and everyone else back where they were.
 */
export function SignInPage({
  reason,
  back,
  turnstileSiteKey,
  onDone,
  onGuest,
}: {
  reason: string | null;
  back: BackLink;
  /** Null when no key is configured (production without Turnstile): codes can't be sent. */
  turnstileSiteKey: string | null;
  onDone: (account: Account) => void;
  /** Reporting without an account (round 2), offered only when the person came to report. */
  onGuest?: () => Promise<void>;
}) {
  const { mount: mountTurnstile, token } = useTurnstile(turnstileSiteKey ?? "", SEND_CODE_ACTION);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<{ to: string; at: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const finish = (account: Account) => {
    if (!account.nick) return onDone(account);
    // Returning neighbours: the ruler runs to the end, then the page hands back.
    setFinished(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => onDone(account), reduce ? 0 : FINISH_MS);
  };

  return (
    <AuthFrame back={back}>
      <StepRuler at={sent ? 1 : 0} done={finished} />
      {sent ? (
        <CodeStep
          key={sent.at}
          to={sent.to}
          sentAt={sent.at}
          finished={finished}
          token={token}
          onResent={() => setSent({ to: sent.to, at: Date.now() })}
          onChangeNumber={() => setSent(null)}
          onVerified={finish}
        />
      ) : (
        <PhoneStep
          reason={reason}
          value={phone}
          available={Boolean(turnstileSiteKey)}
          token={token}
          onChange={setPhone}
          onSent={(to) => setSent({ to, at: Date.now() })}
          onPasskey={finish}
          onGuest={onGuest}
        />
      )}
      {/* Turnstile's widget: invisible unless Cloudflare asks for an interaction. */}
      {turnstileSiteKey && <div ref={mountTurnstile} className="empty:hidden" />}
    </AuthFrame>
  );
}

function PhoneStep({
  reason,
  value,
  available,
  token,
  onChange,
  onSent,
  onPasskey,
  onGuest,
}: {
  reason: string | null;
  value: string;
  available: boolean;
  token: GetToken;
  onChange: (v: string) => void;
  onSent: (e164: string) => void;
  onPasskey: (account: Account) => void;
  onGuest?: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const guest = useMutation({ mutationFn: () => onGuest?.() ?? Promise.resolve() });
  const passkeys = usePasskeySupport();
  const hydrated = useHydrated();
  const [invalid, setInvalid] = useState(false);
  const send = useMutation({ mutationFn: (e164: string) => sendCode(e164, token), onSuccess: onSent });
  const withPasskey = useMutation({
    mutationFn: async () => {
      const r = await authClient.signIn.passkey();
      if (r?.error) throw new Error(r.error.message);
      const account = await getAccount();
      if (!account) throw new Error("Sem sessão depois da passkey.");
      return account;
    },
    onSuccess: (account) => {
      queryClient.setQueryData(accountQuery.queryKey, account);
      onPasskey(account);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const e164 = toE164BR(value);
    if (!e164 || !isBrazilianMobileE164(e164)) return setInvalid(true);
    send.mutate(e164);
  };
  return (
    <>
      <AuthHead title="Entre com o seu celular">
        {reason ?? "Mandamos um código de 6 números pelo WhatsApp. Não tem senha para lembrar."}
      </AuthHead>
      <form noValidate onSubmit={submit} className="grid gap-5">
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="entrar-celular">Seu celular, com DDD</FieldLabel>
          <InputGroup variant="lg">
            <InputGroupAddon>
              <span className="font-mono text-ink-2">+55</span>
            </InputGroupAddon>
            <InputGroupInput
              id="entrar-celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(51) 99999-9999"
              autoFocus
              value={value}
              aria-invalid={invalid}
              aria-describedby="entrar-celular-nota"
              onChange={(e) => {
                setInvalid(false);
                onChange(maskPhoneBR(e.target.value));
              }}
            />
          </InputGroup>
          {invalid ? (
            <FieldError id="entrar-celular-nota">Use um celular com DDD, como (51) 99999-9999.</FieldError>
          ) : (
            <FieldDescription id="entrar-celular-nota">Seu número nunca aparece em público.</FieldDescription>
          )}
        </Field>
        {!available && (
          <p role="alert" className="text-sm text-signal-text">
            Entrar com o celular está indisponível nesta versão: falta configurar a verificação anti-robô.
          </p>
        )}
        {send.isError && (
          <p role="alert" className="text-sm text-signal-text">
            {SEND_FAILURE_MESSAGE[failureOf(send.error)]}
          </p>
        )}
        {withPasskey.isError && (
          <p role="alert" className="text-sm text-signal-text">
            Não deu para entrar com a passkey. Tente de novo, ou entre com o celular.
          </p>
        )}
        <div className="grid gap-2.5">
          <Button type="submit" variant="signal" size="xl" disabled={!hydrated || !available || send.isPending}>
            {send.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MessageCircle aria-hidden="true" />
            )}
            Receber código no WhatsApp
          </Button>
          {passkeys && (
            <Button
              type="button"
              variant="outline"
              size="xl"
              disabled={withPasskey.isPending}
              onClick={() => withPasskey.mutate()}
            >
              {withPasskey.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              Entrar com passkey
            </Button>
          )}
        </div>
        <p className="text-caption text-muted-foreground">Em público, você aparece só com um apelido e o seu bairro.</p>
        {onGuest && (
          <p className="border-t border-hairline pt-4 text-sm text-ink-2">
            Sem celular agora?{" "}
            <button
              type="button"
              className={cn(textLink, "font-medium text-foreground")}
              disabled={!hydrated || guest.isPending}
              onClick={() => guest.mutate()}
            >
              Registrar sem conta
            </button>
            . O registro passa pela moderação antes de aparecer no mapa, e você não pode confirmar outros.
          </p>
        )}
        {guest.isError && (
          <p role="alert" className="text-sm text-signal-text">
            Não deu para continuar sem conta agora. Tente de novo, ou entre com o celular.
          </p>
        )}
      </form>
    </>
  );
}

function CodeStep({
  to,
  sentAt,
  finished,
  token,
  onResent,
  onChangeNumber,
  onVerified,
}: {
  to: string;
  sentAt: number;
  finished: boolean;
  token: GetToken;
  onResent: () => void;
  onChangeNumber: () => void;
  onVerified: (account: Account) => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const now = useNow();
  const wait = Math.max(0, RESEND_AFTER - Math.floor((now - sentAt) / 1000));

  const shownCode = useMutation({ mutationFn: () => devCode(to) });
  const resend = useMutation({
    mutationFn: (e164: string) => sendCode(e164, token),
    onSuccess: () => {
      toast("Mandamos outro código.");
      onResent();
    },
    onError: (e) => toast(SEND_FAILURE_MESSAGE[failureOf(e)]),
  });
  const verify = useMutation({
    mutationFn: async (c: string) => {
      await signInWithCode(to, c);
      const account = await getAccount();
      if (!account) throw new Error("Sem sessão depois de verificar.");
      return account;
    },
    onSuccess: (account) => {
      queryClient.setQueryData(accountQuery.queryKey, account);
      onVerified(account);
    },
    onError: () => setCode(""),
  });
  const busy = verify.isPending || verify.isSuccess || finished;

  return (
    <>
      <AuthHead title="Digite o código">
        Mandamos 6 números para o WhatsApp de{" "}
        <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{maskedPhone(to)}</span>. O código
        vale por 5 minutos.
      </AuthHead>
      <div className="grid gap-4">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label="Código de 6 números"
          aria-describedby="entrar-codigo-estado"
          containerClassName="w-full"
          value={code}
          onChange={setCode}
          onComplete={(c) => verify.mutate(c)}
          disabled={busy}
        >
          <InputOTPGroup size="fill">
            {SLOTS.map((i) => (
              <InputOTPSlot key={i} index={i} aria-invalid={verify.isError} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p
          id="entrar-codigo-estado"
          role={verify.isError ? "alert" : "status"}
          className={cn(
            "-mt-3 flex min-h-5 items-center gap-1.5 text-caption",
            verify.isError ? "text-signal-text" : "text-muted-foreground",
          )}
        >
          {verify.isError ? (
            "Código errado ou vencido. Confira os números ou peça outro."
          ) : finished ? (
            "Tudo certo. Voltando para onde você estava."
          ) : busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Conferindo o código…
            </>
          ) : null}
        </p>
        {import.meta.env.DEV && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline-strong px-3.5 py-2.5 text-caption text-ink-2">
            {shownCode.data ? (
              <>
                <span>
                  Ambiente de teste, nenhum WhatsApp foi enviado. Código:{" "}
                  <b className="font-mono text-foreground">{shownCode.data}</b>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (!shownCode.data) return;
                    setCode(shownCode.data);
                    verify.mutate(shownCode.data);
                  }}
                >
                  Usar
                </Button>
              </>
            ) : (
              <>
                <span>Ambiente de teste: nenhum WhatsApp é enviado.</span>
                <Button size="sm" variant="outline" onClick={() => shownCode.mutate()}>
                  Ver código
                </Button>
              </>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <Button variant="ghost" className="-ml-2.5" onClick={onChangeNumber} disabled={busy}>
            Trocar número
          </Button>
          <Button
            variant="ghost"
            className="-mr-2.5"
            disabled={wait > 0 || resend.isPending || busy}
            onClick={() => resend.mutate(to)}
          >
            {wait > 0 ? (
              <>
                Mandar de novo em <span className="font-mono tabular-nums">{clock(wait)}</span>
              </>
            ) : (
              "Mandar de novo"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
