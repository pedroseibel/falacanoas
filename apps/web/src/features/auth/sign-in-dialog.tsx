import { isBrazilianMobileE164, maskPhoneBR, maskedPhone, suggestNicks, toE164BR } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { MessageCircle } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { accountQuery } from "@/lib/city";
import { authClient } from "@/lib/auth-client";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { getAccount, getDevCode, saveProfile } from "@/server/account";
import { closeSignIn, finishSignIn, setSignInStep, signInStore, type SignInStep } from "./auth-store";
import { ProfileSchema, type Profile } from "./profile-schema";

type Step = SignInStep;
const SLOTS = [0, 1, 2, 3, 4, 5];
const BAIRROS = canoas.neighborhoods.toSorted((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const COPY: Record<Step, { title: string; description: string }> = {
  phone: { title: "Entrar", description: "Com o seu celular. Mandamos um código pelo WhatsApp." },
  code: { title: "Digite o código", description: "" },
  profile: {
    title: "Como você quer aparecer?",
    description: "Seu apelido e seu bairro aparecem nos seus registros. Seu telefone, nunca.",
  },
};

const onOpenChange = (open: boolean) => {
  if (!open) closeSignIn();
};

/** Sign in with a phone code; on the first sign-in, pick an apelido and a bairro. */
export function SignInDialog() {
  const open = useSelector(signInStore, (s) => s.open);
  const reason = useSelector(signInStore, (s) => s.reason);
  const step = useSelector(signInStore, (s) => s.step);
  const to = useSelector(signInStore, (s) => s.to);
  const phone = useMediaQuery(PHONE_QUERY);
  const copy = COPY[step];
  const description =
    step === "phone" && reason
      ? reason
      : step === "code" && to
        ? `Mandamos 6 números para o WhatsApp de ${maskedPhone(to)}.`
        : copy.description;
  const flow = <SignInFlow step={step} to={to} />;
  if (phone)
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{copy.title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{flow}</div>
        </DrawerContent>
      </Drawer>
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {flow}
      </DialogContent>
    </Dialog>
  );
}

function SignInFlow({ step, to }: { step: Step; to: string | null }) {
  if (step === "phone") return <PhoneStep onSent={(e164) => setSignInStep("code", e164)} />;
  if (step === "code" && to)
    return <CodeStep to={to} onBack={() => setSignInStep("phone")} onNeedsProfile={() => setSignInStep("profile")} />;
  if (step === "profile") return <ProfileStep />;
  return null;
}

function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-signal-text">
      {children}
    </p>
  );
}

async function sendCode(e164: string) {
  const r = await authClient.phoneNumber.sendOtp({ phoneNumber: e164 });
  if (r.error) throw new Error(r.error.message);
  return e164;
}

function PhoneStep({ onSent }: { onSent: (e164: string) => void }) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const send = useMutation({ mutationFn: sendCode, onSuccess: onSent });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const e164 = toE164BR(value);
    if (!e164 || !isBrazilianMobileE164(e164)) return setInvalid(true);
    send.mutate(e164);
  };
  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor="entrar-celular">Seu celular, com DDD</FieldLabel>
        <Input
          id="entrar-celular"
          size="lg"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(51) 99999-9999"
          autoFocus
          value={value}
          aria-invalid={invalid}
          onChange={(e) => {
            setInvalid(false);
            setValue(maskPhoneBR(e.target.value));
          }}
        />
        <FieldDescription>Seu número nunca aparece em público.</FieldDescription>
        {invalid && <FieldError>Use um celular com DDD, como (51) 99999-9999.</FieldError>}
      </Field>
      {send.isError && <Problem>Não deu para mandar o código agora. Tente de novo em instantes.</Problem>}
      <Button type="submit" variant="signal" size="xl" disabled={send.isPending}>
        <MessageCircle aria-hidden="true" />
        Receber código no WhatsApp
      </Button>
    </form>
  );
}

function CodeStep({ to, onBack, onNeedsProfile }: { to: string; onBack: () => void; onNeedsProfile: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const devCode = useMutation({ mutationFn: () => getDevCode({ data: to }) });
  const resend = useMutation({ mutationFn: sendCode, onSuccess: () => toast("Mandamos outro código.") });
  const verify = useMutation({
    mutationFn: async (c: string) => {
      const r = await authClient.phoneNumber.verify({ phoneNumber: to, code: c });
      if (r.error) throw new Error(r.error.message);
      return getAccount();
    },
    onSuccess: (account) => {
      queryClient.setQueryData(accountQuery.queryKey, account);
      if (!account?.nick) return onNeedsProfile();
      finishSignIn();
      toast(`Que bom te ver, ${account.nick}.`);
    },
    onError: () => setCode(""),
  });
  return (
    <div className="grid gap-5">
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        aria-label="Código de 6 números"
        value={code}
        onChange={setCode}
        onComplete={(c) => verify.mutate(c)}
        disabled={verify.isPending}
        containerClassName="justify-center"
      >
        <InputOTPGroup size="lg">
          {SLOTS.map((i) => (
            <InputOTPSlot key={i} index={i} aria-invalid={verify.isError} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {verify.isError && <Problem>Código errado ou vencido. Confira ou peça outro.</Problem>}
      {import.meta.env.DEV && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline-strong px-3.5 py-2.5 text-caption text-ink-2">
          {devCode.data ? (
            <>
              <span>
                Ambiente de teste, nenhum WhatsApp foi enviado. Código:{" "}
                <b className="font-mono text-foreground">{devCode.data}</b>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!devCode.data) return;
                  setCode(devCode.data);
                  verify.mutate(devCode.data);
                }}
              >
                Usar
              </Button>
            </>
          ) : (
            <>
              <span>Ambiente de teste: nenhum WhatsApp é enviado.</span>
              <Button size="sm" variant="outline" onClick={() => devCode.mutate()}>
                Ver código
              </Button>
            </>
          )}
        </div>
      )}
      <div className="flex justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Trocar número
        </Button>
        <Button variant="ghost" size="sm" disabled={resend.isPending} onClick={() => resend.mutate(to)}>
          Mandar de novo
        </Button>
      </div>
    </div>
  );
}

function ProfileStep() {
  const queryClient = useQueryClient();
  const [suggestions] = useState(() => suggestNicks());
  const [taken, setTaken] = useState<string | null>(null);
  const defaultValues: Profile = { nick: suggestions[0] ?? "", neighborhood: "" };
  const form = useForm({
    defaultValues,
    validators: { onChange: ProfileSchema, onSubmit: ProfileSchema },
    onSubmit: async ({ value }) => {
      const r = await saveProfile({ data: value });
      if (!r.ok) return setTaken(r.error);
      const account = await getAccount();
      queryClient.setQueryData(accountQuery.queryKey, account);
      finishSignIn();
      toast(`Pronto. Você aparece como ${value.nick}.`);
    },
  });
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const show = <T,>(errors: T[]) => (submitted ? errors : []);
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="nick">
        {(field) => {
          const errors = show(field.state.meta.errors);
          return (
            <Field data-invalid={errors.length > 0 || Boolean(taken)}>
              <FieldLabel htmlFor="perfil-apelido">Apelido</FieldLabel>
              <Input
                id="perfil-apelido"
                size="lg"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={field.state.value}
                aria-invalid={errors.length > 0 || Boolean(taken)}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  setTaken(null);
                  field.handleChange(e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="xs"
                    variant={field.state.value === s ? "default" : "outline"}
                    onClick={() => {
                      setTaken(null);
                      field.handleChange(s);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <FieldError errors={errors} />
              {taken && <FieldError>{taken}</FieldError>}
            </Field>
          );
        }}
      </form.Field>
      <form.Field name="neighborhood">
        {(field) => {
          const errors = show(field.state.meta.errors);
          return (
            <Field data-invalid={errors.length > 0}>
              <FieldLabel htmlFor="perfil-bairro">Seu bairro</FieldLabel>
              <NativeSelect
                id="perfil-bairro"
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
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(busy) => (
          <Button type="submit" variant="signal" size="xl" disabled={busy}>
            Pronto
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
