import {
  DATA_REQUEST_ACTION,
  DATA_REQUEST_DAYS,
  DataRequestSchema,
  REQUEST_KIND_LABEL,
  RequestKindSchema,
  REQUESTER_LABEL,
  RequesterSchema,
  type DataRequest,
  type Requester,
} from "@fala/core";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AuthFrame, AuthHead, type BackLink } from "@/features/auth/auth-frame";
import { useTurnstile } from "@/features/auth/turnstile";
import { textLink } from "@/features/landing/bits";
import { useHydrated } from "@/lib/use-hydrated";
import { submitDataRequest } from "@/server/data-requests";

/** What the pin field asks for, by who is asking. */
const ITEM_HINT: Record<Requester, string> = {
  account: "Se o pedido é sobre um registro, o código (ex.: 7K3QF) ou o link dele.",
  guest: "Cole o link secreto que você recebeu ao registrar: ele mostra que o registro é seu.",
  in_content: "O código do registro (ex.: 7K3QF) ou o link dele, para acharmos a foto ou o texto.",
  former: "Se o pedido é sobre um registro, o código (ex.: 7K3QF) ou o link dele.",
  other: "Se o pedido é sobre um registro, o código (ex.: 7K3QF) ou o link dele.",
};

/**
 * /privacidade/pedido: the data-subject channel (DECISIONS round 18; LGPD art. 18), for anyone, with
 * or without an account. No document is asked for; a guest proves a pin is theirs with its secret
 * link. Someone signed in skips the robot check, and an account holder's request carries the session.
 */
export function DataRequestPage({
  back,
  signedIn,
  turnstileSiteKey,
  initial,
  onDownload,
}: {
  back: BackLink;
  signedIn: boolean;
  turnstileSiteKey: string | null;
  initial: { requester?: Requester; item?: string };
  /** Signed in: where "baixar seus dados" goes. */
  onDownload: () => void;
}) {
  const hydrated = useHydrated();
  const [sent, setSent] = useState<{ protocol: string; contact: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { mount: mountRobot, token: robotToken } = useTurnstile(turnstileSiteKey ?? "", DATA_REQUEST_ACTION);
  const defaultValues: DataRequest = {
    requester: initial.requester ?? (signedIn ? "account" : "in_content"),
    kind: initial.requester === "in_content" ? "content" : "access",
    item: initial.item ?? "",
    text: "",
    contact: "",
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: DataRequestSchema, onSubmit: DataRequestSchema },
    onSubmit: async ({ value }) => {
      setFailure(null);
      const turnstile = signedIn ? null : await robotToken().catch(() => null);
      const r = await submitDataRequest({ data: { ...value, turnstile } }).catch(() => null);
      if (!r) return setFailure("Não deu para enviar agora. Confira a conexão e tente de novo.");
      if (!r.ok) return setFailure(r.error);
      setSent({ protocol: r.protocol, contact: value.contact });
    },
    onSubmitInvalid: () =>
      requestAnimationFrame(() => document.querySelector<HTMLElement>("main [aria-invalid=true]")?.focus()),
  });
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const show = <T,>(errors: T[]) => (submitted ? errors : []);
  const requester = useStore(form.store, (s) => s.values.requester);

  if (sent)
    return (
      <AuthFrame back={back}>
        <AuthHead title="Pedido recebido">
          Respondemos em até {DATA_REQUEST_DAYS} dias, no e-mail{" "}
          <span className="font-medium wrap-anywhere text-foreground">{sent.contact}</span>. Se escrever de novo, cite o
          protocolo.
        </AuthHead>
        <div className="grid gap-1 rounded-xl border border-hairline bg-card p-4 shadow-soft">
          <span className="text-caption text-muted-foreground">Protocolo</span>
          <span className="font-mono text-2xl font-semibold tracking-wide select-all">{sent.protocol}</span>
        </div>
      </AuthFrame>
    );

  return (
    <AuthFrame back={back}>
      <AuthHead title="Pedido sobre os seus dados">
        Para saber o que o Fala guarda sobre você, corrigir, apagar ou tirar do ar um conteúdo em que você aparece. Com
        conta ou sem. Não pedimos documento de identidade.
      </AuthHead>
      {signedIn && (
        <p className="rounded-xl border border-dashed border-hairline-strong px-4 py-3 text-caption text-ink-2">
          Para uma cópia do que a sua conta guarda, não precisa pedir:{" "}
          <button type="button" className={textLink} onClick={onDownload}>
            baixe seus dados em Você
          </button>
          .
        </p>
      )}
      <form
        noValidate
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="requester">
          {(field) => (
            <fieldset className="grid gap-1">
              <FieldLegend variant="label">Quem está pedindo</FieldLegend>
              <RadioGroup
                value={field.state.value}
                onValueChange={(v) => {
                  const next = RequesterSchema.safeParse(v);
                  if (next.success) field.handleChange(next.data);
                }}
              >
                {RequesterSchema.options.map((r) => (
                  <Field key={r} orientation="horizontal">
                    <RadioGroupItem value={r} id={`pd-quem-${r}`} />
                    <FieldContent>
                      <FieldLabel htmlFor={`pd-quem-${r}`} variant="option">
                        {REQUESTER_LABEL[r]}
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                ))}
              </RadioGroup>
            </fieldset>
          )}
        </form.Field>

        <form.Field name="kind">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="pd-pedido">O que você quer</FieldLabel>
              <NativeSelect
                id="pd-pedido"
                size="lg"
                value={field.state.value}
                onChange={(e) => {
                  const next = RequestKindSchema.safeParse(e.target.value);
                  if (next.success) field.handleChange(next.data);
                }}
              >
                {RequestKindSchema.options.map((k) => (
                  <NativeSelectOption key={k} value={k}>
                    {REQUEST_KIND_LABEL[k]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        </form.Field>

        <form.Field name="item">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="pd-registro">
                  Registro <span className="font-normal text-muted-foreground">(se for sobre um)</span>
                </FieldLabel>
                <Input
                  id="pd-registro"
                  size="lg"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={field.state.value}
                  aria-invalid={errors.length > 0}
                  aria-describedby="pd-registro-nota"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {errors.length ? (
                  <FieldError id="pd-registro-nota" errors={errors} />
                ) : (
                  <FieldDescription id="pd-registro-nota">{ITEM_HINT[requester]}</FieldDescription>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="text">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="pd-texto">O que você precisa</FieldLabel>
                <Textarea
                  id="pd-texto"
                  rows={5}
                  maxLength={2000}
                  value={field.state.value}
                  aria-invalid={errors.length > 0}
                  aria-describedby={errors.length ? "pd-texto-erro" : undefined}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ex.: meu rosto aparece na segunda foto deste registro. Peço que seja ocultado."
                />
                <FieldError id="pd-texto-erro" errors={errors} />
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="contact">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="pd-email">E-mail para a resposta</FieldLabel>
                <Input
                  id="pd-email"
                  type="email"
                  size="lg"
                  autoComplete="email"
                  inputMode="email"
                  value={field.state.value}
                  aria-invalid={errors.length > 0}
                  aria-describedby="pd-email-nota"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {errors.length ? (
                  <FieldError id="pd-email-nota" errors={errors} />
                ) : (
                  <FieldDescription id="pd-email-nota">
                    Só para responder este pedido. Respondemos em até {DATA_REQUEST_DAYS} dias.
                  </FieldDescription>
                )}
              </Field>
            );
          }}
        </form.Field>

        {!signedIn && turnstileSiteKey && <div ref={mountRobot} className="hidden has-[iframe]:block" />}
        {failure && (
          <p role="alert" className="text-caption text-signal-text">
            {failure}
          </p>
        )}
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(busy) => (
            <Button
              type="submit"
              variant="signal"
              size="xl"
              disabled={!hydrated || busy || (!signedIn && !turnstileSiteKey)}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Enviar pedido
            </Button>
          )}
        </form.Subscribe>
        {!signedIn && !turnstileSiteKey && (
          <p className="-mt-3 text-caption text-muted-foreground">
            O formulário está fora do ar. Escreva para contato@falacanoas.com.br.
          </p>
        )}
      </form>
    </AuthFrame>
  );
}
