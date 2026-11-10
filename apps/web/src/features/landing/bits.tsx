import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { reveal } from "./motion";

export function Wrap({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-wrap px-gutter", className)}>{children}</div>;
}

export function Section({ id, divided = false, children }: { id: string; divided?: boolean; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`h-${id}`}
      className={divided ? "border-t border-hairline py-section" : "py-section"}
    >
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function SecHead({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-head grid grid-cols-lead items-end gap-x-hero gap-y-6 max-split:grid-cols-1">
      <h2 id={`h-${id}`} className="text-title font-semibold text-balance">
        {title}
      </h2>
      <p className="max-w-copy text-pretty text-ink-2">{children}</p>
    </div>
  );
}

/** The lit ground behind product shots. */
export function Stage({
  className,
  children,
  rise = true,
  ...aria
}: {
  className?: string;
  children: ReactNode;
  rise?: boolean;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      ref={rise ? reveal : undefined}
      className={cn(
        "relative isolate overflow-hidden rounded-4xl border border-hairline bg-stage transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs",
        className,
      )}
      {...aria}
    >
      {children}
    </div>
  );
}

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono tabular-nums", className)}>{children}</span>;
}

/** Superscript footnote link to the sources in the footer. */
export function Fn({ n }: { n: number }) {
  return (
    <sup>
      <a
        href={`#fn${n}`}
        aria-label={`Fonte ${n}`}
        className="px-px font-mono text-micro text-muted-foreground no-underline hover:text-foreground"
      >
        {n}
      </a>
    </sup>
  );
}
