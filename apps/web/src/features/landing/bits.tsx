import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { reveal } from "./motion";

/** Layout pieces shared by the landing page sections. */

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

export function Claim({
  step,
  title,
  children,
  more,
  className,
}: {
  step?: number;
  title: string;
  children: ReactNode;
  more?: string;
  className?: string;
}) {
  return (
    <div
      ref={reveal}
      className={cn(
        "grid content-start gap-4 transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs",
        className,
      )}
    >
      {step !== undefined && (
        <span className="inline-flex size-8 items-center justify-center rounded-full border border-border font-mono text-caption text-ink-2">
          {step}
        </span>
      )}
      <h3 className="text-heading font-semibold text-balance">{title}</h3>
      <div className="grid max-w-claim gap-4 text-pretty text-ink-2">{children}</div>
      {more && <p className="text-sm text-muted-foreground">{more}</p>}
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

export function Panel({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <div
      aria-label={label}
      role={label ? "group" : undefined}
      className={cn("relative overflow-hidden rounded-2xl border border-hairline bg-card shadow-panel", className)}
    >
      {children}
    </div>
  );
}

/** A panel's title bar: bold title, quiet details, a chip pushed to the end. */
export function Bar({ title, children, end }: { title: string; children?: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 border-b border-hairline pr-3.5 pl-4 text-caption text-muted-foreground">
      <strong className="font-semibold tracking-tight text-foreground">{title}</strong>
      {children}
      {end && <span className="ml-auto">{end}</span>}
    </div>
  );
}

/** Mono, tabular figures. */
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

/** An inline link in running text. */
export const textLink = "underline decoration-hairline-strong decoration-1 underline-offset-3 hover:decoration-current";
