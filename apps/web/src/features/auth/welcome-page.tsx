import { NickSchema, initials, suggestNicks } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { textLink } from "@/components/text-link";
import { PRIVACY_NOTICE_PATH } from "@/features/legal/privacy";
import { accountQuery } from "@/lib/account";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { getAccount, saveProfile, type Account } from "@/server/account";
import { AuthFrame, AuthHead } from "@/components/page-frame";
import type { AppLink } from "@/components/app-link";
import { ProfileSchema, type Profile } from "./profile-schema";
import { StepRuler } from "./step-ruler";

const BAIRROS = canoas.neighborhoods.toSorted((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/** /bem-vindo: the public face of an account, an apelido and a bairro, shown as it will appear. */
export function WelcomePage({
  account,
  back,
  onDone,
}: {
  account: Account;
  back: AppLink;
  onDone: (nick: string) => void;
}) {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const [suggestions] = useState(() => suggestNicks());
  const [taken, setTaken] = useState<string | null>(null);
  // Declarations already made against the current notice aren't asked again.
  const declared = account.declarationsCurrent;
  const defaultValues: Profile = {
    nick: account.nick ?? suggestions[0] ?? "",
    neighborhood: account.neighborhood ?? "",
    adult: declared,
    privacyRead: declared,
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: ProfileSchema, onSubmit: ProfileSchema },
    onSubmit: async ({ value }) => {
      const r = await saveProfile({ data: value });
      if (!r.ok) return setTaken(r.error);
      queryClient.setQueryData(accountQuery.queryKey, await getAccount());
      onDone(value.nick);
    },
    onSubmitInvalid: () =>
      requestAnimationFrame(() => document.querySelector<HTMLElement>("main [aria-invalid=true]")?.focus()),
  });
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const show = <T,>(errors: T[]) => (submitted ? errors : []);
  const nick = useStore(form.store, (s) => NickSchema.safeParse(s.values.nick).data ?? null);
  const bairro = useStore(form.store, (s) => BAIRROS.find((b) => b.slug === s.values.neighborhood)?.name ?? null);

  return (
    <AuthFrame back={back}>
      <StepRuler at={2} from="code" />
      <AuthHead title="Como você quer aparecer?">
        Seu apelido e seu bairro aparecem nos seus registros. Seu telefone, nunca.
      </AuthHead>
      <form
        noValidate
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="nick">
          {(field) => {
            const errors = show(field.state.meta.errors);
            const invalid = errors.length > 0 || Boolean(taken);
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor="bv-apelido">Apelido</FieldLabel>
                <Input
                  id="bv-apelido"
                  size="lg"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={field.state.value}
                  aria-invalid={invalid}
                  aria-describedby="bv-apelido-nota"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setTaken(null);
                    field.handleChange(e.target.value);
                  }}
                />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões de apelido">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="chip"
                      variant={field.state.value === s ? "default" : "outline"}
                      aria-pressed={field.state.value === s}
                      onClick={() => {
                        setTaken(null);
                        field.handleChange(s);
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                {invalid ? (
                  <FieldError id="bv-apelido-nota" errors={taken ? [{ message: taken }] : errors} />
                ) : (
                  <FieldDescription id="bv-apelido-nota">
                    Letras, números e hífens. Pássaros do Sinos e cantos do bairro, se faltar ideia.
                  </FieldDescription>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="neighborhood">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="bv-bairro">Seu bairro</FieldLabel>
                <NativeSelect
                  id="bv-bairro"
                  size="lg"
                  required
                  value={field.state.value}
                  aria-invalid={errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  <NativeSelectOption value="">Escolha seu bairro</NativeSelectOption>
                  {BAIRROS.map((b) => (
                    <NativeSelectOption key={b.slug} value={b.slug}>
                      {b.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={errors} />
              </Field>
            );
          }}
        </form.Field>

        <section aria-labelledby="bv-previa" className="grid gap-2">
          <h2 id="bv-previa" className="text-caption text-muted-foreground">
            Assim você aparece nos registros
          </h2>
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card p-3.5 shadow-soft">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-semibold"
            >
              {nick ? initials(nick) || nick.charAt(0).toUpperCase() : "?"}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className={cn("truncate text-sm font-semibold", !nick && "text-muted-foreground")}>
                {nick ?? "seu-apelido"}
              </span>
              <span className="text-caption text-muted-foreground">{bairro ?? "seu bairro"} · registrou hoje</span>
            </span>
          </div>
        </section>

        {!declared && (
          <fieldset className="grid gap-3 border-t border-hairline pt-5">
            <legend className="sr-only">Declarações</legend>
            <form.Field name="adult">
              {(field) => {
                const errors = show(field.state.meta.errors);
                return (
                  <Field orientation="horizontal" data-invalid={errors.length > 0}>
                    <Checkbox
                      id="bv-maior"
                      size="lg"
                      checked={field.state.value}
                      aria-invalid={errors.length > 0}
                      aria-describedby={errors.length > 0 ? "bv-maior-erro" : undefined}
                      onCheckedChange={(on) => field.handleChange(on)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="bv-maior" variant="option">
                        Declaro que tenho 18 anos ou mais.
                      </FieldLabel>
                      <FieldError id="bv-maior-erro" errors={errors} />
                    </FieldContent>
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="privacyRead">
              {(field) => {
                const errors = show(field.state.meta.errors);
                return (
                  <Field orientation="horizontal" data-invalid={errors.length > 0}>
                    <Checkbox
                      id="bv-aviso"
                      size="lg"
                      checked={field.state.value}
                      aria-invalid={errors.length > 0}
                      aria-describedby={errors.length > 0 ? "bv-aviso-erro" : undefined}
                      onCheckedChange={(on) => field.handleChange(on)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="bv-aviso" variant="option" className="block">
                        Confirmo que li o{" "}
                        <a href={PRIVACY_NOTICE_PATH} target="_blank" rel="noopener" className={textLink}>
                          aviso de privacidade
                          <span className="sr-only"> (abre em outra aba)</span>
                        </a>
                        .
                      </FieldLabel>
                      <FieldError id="bv-aviso-erro" errors={errors} />
                    </FieldContent>
                  </Field>
                );
              }}
            </form.Field>
          </fieldset>
        )}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(busy) => (
            <Button type="submit" variant="signal" size="xl" disabled={!hydrated || busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Pronto
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthFrame>
  );
}
