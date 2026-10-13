import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Reasons moderators reach for most, worded for the public history: neutral, about the content, never
 * repeating what it exposed. One tap fills the field; it can still be edited.
 */
const COMMON = [
  "Expõe uma pessoa.",
  "Mostra uma criança.",
  "Conteúdo impróprio.",
  "Ofensa ou ameaça.",
  "Não mostra o problema.",
  "Propaganda ou spam.",
];

/** The reason for a removal: it shows in the item's history and to whoever posted. */
export function RemovalNote({
  id,
  value,
  onChange,
  label = "Motivo",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {COMMON.map((c) => (
          <Button
            key={c}
            type="button"
            variant="outline"
            size="chip"
            aria-pressed={value === c}
            onClick={() => onChange(c)}
          >
            {c.slice(0, -1)}
          </Button>
        ))}
      </div>
      <Textarea
        id={id}
        value={value}
        maxLength={280}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: a foto mostra o rosto de uma pessoa."
      />
      <p className="text-caption text-muted-foreground">
        Aparece no histórico do registro e para quem publicou. Não repita o que foi exposto.
      </p>
    </div>
  );
}
