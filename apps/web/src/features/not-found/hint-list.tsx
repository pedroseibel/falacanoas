import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Go } from "@/components/app-link";

export interface HintLink {
  href: string;
  /** "Mathias Velho", "Registro 7K3QF". */
  label: string;
  /** What it is, quietly: "bairro", "registro". */
  kind: string;
  /** A code, set in mono. */
  mono?: boolean;
}

/** "Você quis dizer…": the likely destinations, as hairline rows that are whole links. */
export function HintList({ title, hints, go }: { title: string; hints: HintLink[]; go: Go }) {
  if (!hints.length) return null;
  return (
    <div className="grid gap-2.5">
      <p className="text-ui text-ink-2">{title}</p>
      <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
        {hints.map((h) => {
          const link = go(h.href);
          return (
            <li key={h.href}>
              <a
                href={link.href}
                onClick={link.onClick}
                className="group flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors duration-200 ease-fluid hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium",
                    h.mono ? "font-mono text-ui tracking-wide" : "text-ui",
                  )}
                >
                  {h.label}
                </span>
                <span className="text-caption text-muted-foreground">{h.kind}</span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-fluid group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
