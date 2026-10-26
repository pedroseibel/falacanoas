import { floodLines, type FloodNotes } from "@fala/core";

/**
 * What the reporter saw on a street that floods (core flooding.ts): said as theirs, never as the
 * cause. Nothing when they answered nothing.
 */
export function FloodNotesSection({ notes }: { notes: FloodNotes | undefined }) {
  const lines = notes ? floodLines(notes) : [];
  if (!lines.length) return null;
  return (
    <section aria-labelledby="agua">
      <h3 id="agua" className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        Sobre a água <small className="text-xs font-normal text-muted-foreground">segundo quem registrou</small>
      </h3>
      <dl className="mt-2 grid gap-1.5 text-sm">
        {lines.map((l) => (
          <div key={l.term} className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">{l.term}</dt>
            <dd className="min-w-0 text-ink-2">{l.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
