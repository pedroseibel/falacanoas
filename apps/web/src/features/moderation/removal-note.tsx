import { REMOVAL_REASONS, type RemovalWeight } from "@fala/core";
import { Button } from "@/components/ui/button";
import { RadioGroupSegment, RadioGroupSegmented } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

export interface Removal {
  note: string;
  weight: RemovalWeight;
}

export const emptyRemoval: Removal = { note: "", weight: "strike" };

const WEIGHTS: { value: RemovalWeight; label: string }[] = [
  { value: "none", label: "Não conta" },
  { value: "strike", label: "Conta" },
  { value: "grave", label: "Grave" },
];
const asWeight = (v: unknown): RemovalWeight | null => WEIGHTS.find((w) => w.value === v)?.value ?? null;

/**
 * The reason for a removal, which shows in the item's history and to whoever posted, and what it
 * weighs against them (round 19): an honest mistake doesn't count, three that count in 30 days mute
 * the account, a grave one mutes it at once. A one-tap reason sets both; either can still change.
 */
export function RemovalNote({
  id,
  value,
  onChange,
  label = "Motivo",
}: {
  id: string;
  value: Removal;
  onChange: (v: Removal) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {REMOVAL_REASONS.map((r) => (
          <Button
            key={r.text}
            type="button"
            variant="outline"
            size="chip"
            aria-pressed={value.note === r.text}
            onClick={() => onChange({ note: r.text, weight: r.weight })}
          >
            {r.text.slice(0, -1)}
          </Button>
        ))}
      </div>
      <Textarea
        id={id}
        value={value.note}
        maxLength={280}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder="Ex.: a foto mostra o rosto de uma pessoa."
      />
      <p className="text-caption text-muted-foreground">
        Aparece no histórico do registro e para quem publicou. Não repita o que foi exposto.
      </p>
      <div className="grid gap-1.5">
        <span id={`${id}-peso`} className="text-sm font-medium">
          Conta contra quem enviou?
        </span>
        <RadioGroupSegmented
          aria-labelledby={`${id}-peso`}
          value={value.weight}
          onValueChange={(v) => onChange({ ...value, weight: asWeight(v) ?? value.weight })}
        >
          {WEIGHTS.map((w) => (
            <RadioGroupSegment key={w.value} value={w.value}>
              {w.label}
            </RadioGroupSegment>
          ))}
        </RadioGroupSegmented>
        <p className="text-caption text-muted-foreground">
          {value.weight === "none"
            ? "Engano de boa-fé, como um rosto ou uma placa legível: não pesa contra a conta."
            : value.weight === "grave"
              ? "Nudez ou conteúdo sexual: a conta fica silenciada na hora, por 30 dias."
              : "Três remoções que contam em 30 dias silenciam a conta por 30 dias."}
        </p>
      </div>
    </div>
  );
}
