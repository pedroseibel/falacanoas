import {
  QueueSignupSchema,
  maskPhoneBR,
  missingSignups,
  type Help,
  type Municipality,
  type QueueSignup,
  type SignupChannel,
} from "@fala/core";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Copy, Loader2, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroupSegment, RadioGroupSegmented } from "@/components/ui/radio-group";
import { joinQueue } from "@/server/queue";
import { Panel, Stage, Wrap, textLink } from "./bits";
import { bairrosByName, fmt, plural, shareMessage, shareUrl, type QueueState } from "./landing-model";
import { QueueMeter } from "./queue-meter";

export type Channel = SignupChannel;

const HELP: { value: Help; label: string }[] = [
  { value: "moderar", label: "Moderar os registros do meu bairro" },
  { value: "codigo", label: "Programação ou design" },
  { value: "divulgar", label: "Divulgar nos grupos do meu bairro" },
];

const CHANNEL_COPY: Record<Channel, { label: string; hint: string; placeholder: string }> = {
  whatsapp: {
    label: "Seu WhatsApp, com DDD",
    hint: "Você confirma com uma mensagem que já vem escrita.",
    placeholder: "(51) 99999-9999",
  },
  email: {
    label: "Seu e-mail",
    hint: "Você confirma por um link que chega no e-mail.",
    placeholder: "voce@exemplo.com",
  },
};

const isChannel = (v: unknown): v is Channel => v === "whatsapp" || v === "email";

/** The sign-up form lives on the page, because the hero, the map and the list all pick its bairro. */
export function useJoinForm(initial: { neighborhood: string; channel: Channel }) {
  const join = useMutation({ mutationFn: (data: QueueSignup) => joinQueue({ data }) });
  const defaultValues: QueueSignup = {
    neighborhood: initial.neighborhood,
    channel: initial.channel,
    contact: "",
    help: [],
    consent: false,
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: QueueSignupSchema, onSubmit: QueueSignupSchema },
    onSubmit: ({ value }) => join.mutateAsync(value).catch(() => undefined),
    onSubmitInvalid: () => {
      // Focus the first field that needs attention, once React has marked it.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#entrar [aria-invalid=true]")?.focus());
    },
  });
  return { form, join };
}
export type JoinForm = ReturnType<typeof useJoinForm>;

export function Join({
  muni,
  confirmed,
  queue,
  join: { form, join },
  onPick,
  onChannel,
}: {
  muni: Municipality;
  confirmed: Record<string, number>;
  queue: QueueState;
  join: JoinForm;
  onPick: (slug: string) => void;
  onChannel: (channel: Channel) => void;
}) {
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const channel = useStore(form.store, (s) => s.values.channel);
  const copy = CHANNEL_COPY[channel];
  const show = <T,>(errors: T[]) => (submitted ? errors : []);
  return (
    <section id="entrar" aria-labelledby="h-entrar" className="border-t border-hairline py-section">
      <Wrap>
        <div className="grid grid-cols-join items-start gap-split max-split:grid-cols-1">
          <div className="grid content-start gap-4 split:sticky split:top-27.5">
            <h2 id="h-entrar" className="text-title font-semibold text-balance">
              Coloque seu bairro na fila.
            </h2>
            <p className="max-w-claim text-pretty text-ink-2">
              Quando a fila do seu bairro encher, você recebe um aviso e o mapa abre ali. Até lá, nenhuma outra
              mensagem.
            </p>
            <QueueMeter state={queue} />
          </div>

          <Stage rise={false} className="p-proof max-compact:p-3.5">
            <Panel>
              {join.isSuccess && join.variables ? (
                <Done muni={muni} confirmed={confirmed} sent={join.variables} result={join.data} />
              ) : (
                <form
                  noValidate
                  className="grid gap-5 p-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field name="neighborhood">
                    {(field) => (
                      <Field data-invalid={show(field.state.meta.errors).length > 0}>
                        <FieldLabel htmlFor="f-bairro">Seu bairro</FieldLabel>
                        <NativeSelect
                          id="f-bairro"
                          size="lg"
                          required
                          value={field.state.value}
                          aria-invalid={show(field.state.meta.errors).length > 0}
                          onBlur={field.handleBlur}
                          onChange={(e) => onPick(e.target.value)}
                        >
                          <NativeSelectOption value="">Escolha seu bairro</NativeSelectOption>
                          {bairrosByName(muni.neighborhoods).map((b) => (
                            <NativeSelectOption key={b.slug} value={b.slug}>
                              {b.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <FieldError errors={show(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>

                  <FieldSet>
                    <FieldLegend variant="label">Como quer ser avisado</FieldLegend>
                    <RadioGroupSegmented value={channel} onValueChange={(v) => isChannel(v) && onChannel(v)}>
                      <RadioGroupSegment value="whatsapp">
                        <MessageCircle aria-hidden="true" />
                        WhatsApp
                      </RadioGroupSegment>
                      <RadioGroupSegment value="email">
                        <Mail aria-hidden="true" />
                        E-mail
                      </RadioGroupSegment>
                    </RadioGroupSegmented>
                  </FieldSet>

                  <form.Field name="contact">
                    {(field) => {
                      const errors = show(field.state.meta.errors);
                      return (
                        <Field data-invalid={errors.length > 0}>
                          <FieldLabel htmlFor="f-contato">{copy.label}</FieldLabel>
                          <Input
                            id="f-contato"
                            size="lg"
                            name="contato"
                            type={channel === "whatsapp" ? "tel" : "email"}
                            inputMode={channel === "whatsapp" ? "tel" : "email"}
                            autoComplete={channel === "whatsapp" ? "tel-national" : "email"}
                            placeholder={copy.placeholder}
                            value={field.state.value}
                            aria-invalid={errors.length > 0}
                            aria-describedby="h-contato"
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(channel === "whatsapp" ? maskPhoneBR(e.target.value) : e.target.value)
                            }
                          />
                          <FieldDescription id="h-contato">{copy.hint}</FieldDescription>
                          <FieldError errors={errors} />
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="help">
                    {(field) => (
                      <FieldSet>
                        <FieldLegend variant="label">
                          Posso ajudar com <span className="font-normal text-muted-foreground">(opcional)</span>
                        </FieldLegend>
                        <div className="grid gap-2.5">
                          {HELP.map((h) => (
                            <Field key={h.value} orientation="horizontal">
                              <Checkbox
                                id={`f-ajuda-${h.value}`}
                                size="lg"
                                checked={field.state.value.includes(h.value)}
                                onCheckedChange={(on) =>
                                  field.handleChange(
                                    on
                                      ? [...field.state.value, h.value]
                                      : field.state.value.filter((v) => v !== h.value),
                                  )
                                }
                              />
                              <FieldLabel htmlFor={`f-ajuda-${h.value}`} variant="option">
                                {h.label}
                              </FieldLabel>
                            </Field>
                          ))}
                        </div>
                      </FieldSet>
                    )}
                  </form.Field>

                  <form.Field name="consent">
                    {(field) => {
                      const errors = show(field.state.meta.errors);
                      return (
                        <div className="grid gap-2 border-t border-hairline pt-4.5">
                          <Field orientation="horizontal" data-invalid={errors.length > 0}>
                            <Checkbox
                              id="f-consent"
                              size="lg"
                              checked={field.state.value}
                              aria-invalid={errors.length > 0}
                              onCheckedChange={(on) => field.handleChange(on)}
                            />
                            <FieldLabel htmlFor="f-consent" variant="option" className="block">
                              Tenho 18 anos ou mais e li o{" "}
                              <a
                                href="#privacidade"
                                className={textLink}
                                onClick={() => {
                                  const d = document.getElementById("privacidade");
                                  if (d instanceof HTMLDetailsElement) d.open = true;
                                }}
                              >
                                aviso de privacidade
                              </a>
                              .
                            </FieldLabel>
                          </Field>
                          <FieldError errors={errors} />
                        </div>
                      );
                    }}
                  </form.Field>

                  <form.Subscribe selector={(s) => s.isSubmitting}>
                    {(busy) => (
                      <Button type="submit" variant="signal" size="xl" className="w-full" disabled={busy}>
                        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                        Entrar na fila
                        <ArrowRight aria-hidden="true" />
                      </Button>
                    )}
                  </form.Subscribe>
                  <p className="text-center text-xs text-muted-foreground">Só contam inscrições confirmadas.</p>
                  {join.isError && (
                    <p role="alert" className="text-caption font-medium text-signal-text">
                      Não deu para salvar agora. Sua conexão pode ter caído; tente de novo em instantes.
                    </p>
                  )}
                </form>
              )}
            </Panel>
          </Stage>
        </div>
      </Wrap>
    </section>
  );
}

/** Brings the confirmation into view and moves focus to it, once, when it appears. */
function focusOnMount(el: HTMLElement | null) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "center",
  });
}

function Done({
  muni,
  confirmed,
  sent,
  result,
}: {
  muni: Municipality;
  confirmed: Record<string, number>;
  sent: QueueSignup;
  result: {
    code: string;
    saved: boolean;
    alreadyConfirmed: boolean;
    delivered: boolean;
    whatsappNumber: string | null;
  };
}) {
  const [copied, setCopied] = useState(false);
  const b = muni.neighborhoods.find((n) => n.slug === sent.neighborhood);
  if (!b) return null;
  const domain = muni.branding.domain;
  const missing = missingSignups(b.threshold, confirmed[b.slug] ?? 0);
  const wa = sent.channel === "whatsapp";
  const confirmText = `CONFIRMAR ${result.code}`;
  const ok = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };
  const copyLink = () => {
    const url = shareUrl(domain, b.slug);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(ok, () => prompt("Copie o link:", url));
    else prompt("Copie o link:", url);
  };
  return (
    <div ref={focusOnMount} tabIndex={-1} aria-live="polite" className="grid gap-4.5 p-card outline-none">
      <h3 className="text-2xl font-semibold tracking-tight">
        {result.alreadyConfirmed
          ? `Você já está na fila de ${b.name}.`
          : wa
            ? "Falta um passo: confirmar no WhatsApp."
            : "Falta um passo: abrir o e-mail."}
      </h3>
      <p className="text-ui text-ink-2">
        {result.alreadyConfirmed
          ? "Esta inscrição já foi confirmada antes e continua contando. Nada mudou."
          : wa
            ? result.whatsappNumber
              ? `Toque no botão e envie a mensagem que já vem escrita. É assim que sabemos que o número é seu. Só depois disso você passa a contar na fila de ${b.name}.`
              : `Sua inscrição está guardada. O número do Fala no WhatsApp ainda não está ativo: quando estiver, mandamos uma mensagem para você confirmar, e só depois disso você passa a contar na fila de ${b.name}.`
            : result.delivered
              ? `Mandamos um link de confirmação para ${sent.contact.trim()}. Se não chegar em alguns minutos, olhe a caixa de spam. Só depois disso você passa a contar na fila de ${b.name}.`
              : `Sua inscrição está guardada. O envio do link de confirmação por e-mail ainda não está ligado: quando estiver, mandamos o link para ${sent.contact.trim()}, e só depois disso você passa a contar na fila de ${b.name}.`}
      </p>
      {wa && !result.alreadyConfirmed && (
        <>
          <div className="rounded-xl border border-hairline bg-muted px-3.5 py-3 text-center font-mono text-lg tracking-widest">
            {confirmText}
          </div>
          {result.whatsappNumber ? (
            <Button
              variant="signal"
              size="xl"
              nativeButton={false}
              render={
                <a
                  href={`https://wa.me/${result.whatsappNumber}?text=${encodeURIComponent(confirmText)}`}
                  target="_blank"
                  rel="noopener"
                />
              }
            >
              <MessageCircle aria-hidden="true" />
              Confirmar no WhatsApp
            </Button>
          ) : (
            <Button variant="signal" size="xl" disabled>
              <MessageCircle aria-hidden="true" />
              Confirmar no WhatsApp
            </Button>
          )}
        </>
      )}
      {!result.saved && (
        <p className="rounded-xl border border-dashed border-hairline-strong px-3.25 py-2.75 text-caption text-ink-2">
          Esta página ainda está em pré-visualização: a inscrição não foi gravada em lugar nenhum.
        </p>
      )}
      <div className="grid gap-2.5 border-t border-hairline pt-4.5">
        <p className="text-ui">
          <b className="font-semibold">Chame seus vizinhos.</b>{" "}
          <span className="text-ink-2">
            {b.threshold
              ? `Faltam ${fmt(missing)} ${plural(missing, "inscrito", "inscritos")} para ${b.name} abrir. `
              : ""}
            Quem chega pelo seu link já cai no bairro certo.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMessage(domain, b))}`}
                target="_blank"
                rel="noopener"
              />
            }
          >
            <MessageCircle aria-hidden="true" />
            Mandar no grupo
          </Button>
          <Button variant="outline" size="lg" onClick={copyLink}>
            <Copy aria-hidden="true" />
            <span aria-live="polite">{copied ? "Link copiado" : "Copiar link"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
