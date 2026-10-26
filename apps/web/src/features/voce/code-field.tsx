import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

const SLOTS = [0, 1, 2, 3, 4, 5];

/** Six digits from WhatsApp, with the line under it: an error, or a note. */
export function CodeField({
  id,
  value,
  onChange,
  onComplete,
  error,
  note,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error: string | null;
  note: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2">
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        aria-label="Código de 6 números"
        aria-describedby={`${id}-estado`}
        containerClassName="w-full"
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
      >
        <InputOTPGroup size="fill">
          {SLOTS.map((i) => (
            <InputOTPSlot key={i} index={i} aria-invalid={Boolean(error)} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <p
        id={`${id}-estado`}
        role={error ? "alert" : "status"}
        className={cn("min-h-5 text-caption", error ? "text-destructive" : "text-muted-foreground")}
      >
        {error ?? note}
      </p>
    </div>
  );
}

/** Development: the code that would have gone to WhatsApp, and a button to use it. */
export function DevCode({ code, disabled, onUse }: { code: string; disabled: boolean; onUse: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline-strong px-3.5 py-2.5 text-caption text-ink-2">
      <span>
        Ambiente de teste, nenhum WhatsApp foi enviado. Código: <b className="font-mono text-foreground">{code}</b>
      </span>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onUse}>
        Usar
      </Button>
    </div>
  );
}
