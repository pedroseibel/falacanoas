import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

export function Bar({ title, children, end }: { title: string; children?: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 border-b border-hairline pr-3.5 pl-4 text-caption text-muted-foreground">
      <strong className="font-semibold tracking-tight text-foreground">{title}</strong>
      {children}
      {end && <span className="ml-auto">{end}</span>}
    </div>
  );
}
