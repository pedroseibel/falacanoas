import { FLOOD_CAUSES, FLOOD_DURATIONS, type FloodNotes } from "@fala/core";
import { Button } from "@/components/ui/button";

const RAIN = [
  { key: "sim", label: "Sim" },
  { key: "nao", label: "Não" },
] as const;

/** One question as choice chips: one answer or none. Tapping the chosen one clears it. */
function Question<K extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { key: K; label: string }[];
  value: K | undefined;
  onChange: (next: K | undefined) => void;
}) {
  return (
    <div className="grid gap-2">
      <p id={id} className="text-sm text-ink-2">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Button
            key={o.key}
            type="button"
            size="chip"
            variant={value === o.key ? "default" : "outline"}
            aria-pressed={value === o.key}
            onClick={() => onChange(value === o.key ? undefined : o.key)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * The three questions a street that floods asks (core flooding.ts; research/alagamentos): what the
 * person saw, whether it's raining, how long the water stayed. All optional.
 */
export function FloodQuestions({
  value,
  onChange,
}: {
  value: FloodNotes;
  /** Given an update from the latest answers, so two taps before a render both count. */
  onChange: (update: (prev: FloodNotes) => FloodNotes) => void;
}) {
  const set = (patch: Partial<FloodNotes>) =>
    onChange((prev) => {
      const { cause, raining, duration } = { ...prev, ...patch };
      // An answer taken back leaves no key behind.
      return {
        ...(cause ? { cause } : {}),
        ...(raining === undefined ? {} : { raining }),
        ...(duration ? { duration } : {}),
      };
    });
  return (
    <div className="grid gap-4">
      <Question
        id="r-agua-causa"
        label="O que você viu?"
        options={FLOOD_CAUSES}
        value={value.cause}
        onChange={(cause) => set({ cause })}
      />
      <Question
        id="r-agua-chuva"
        label="Está chovendo agora?"
        options={RAIN}
        value={value.raining === undefined ? undefined : value.raining ? "sim" : "nao"}
        onChange={(k) => set({ raining: k === undefined ? undefined : k === "sim" })}
      />
      <Question
        id="r-agua-tempo"
        label="Quanto tempo a água ficou?"
        options={FLOOD_DURATIONS}
        value={value.duration}
        onChange={(duration) => set({ duration })}
      />
      <p className="text-caption text-muted-foreground">
        Ajuda a entender por que a rua alaga: um bueiro, a valeta, a casa de bombas ou o rio. Marque só o que você viu;
        toque de novo para desmarcar.
      </p>
    </div>
  );
}
