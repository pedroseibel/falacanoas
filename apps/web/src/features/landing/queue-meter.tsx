import { useMemo, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";
import { fmt, plural, type QueueState } from "./landing-model";
import { countUpNow } from "./motion";

function B({ children, ref }: { children: ReactNode; ref?: Ref<HTMLElement> }) {
  return (
    <b ref={ref} className="font-medium text-foreground">
      {children}
    </b>
  );
}

/** One line under a bairro picker: how far its queue is from opening. */
export function QueueMeter({
  state,
  hint,
  className,
}: {
  state: QueueState;
  hint?: string | null;
  className?: string;
}) {
  const missing = state.kind === "missing" ? state.missing : 0;
  const name = state.kind === "none" ? "" : state.name;
  // A new callback per bairro replays the count; the same bairro keeps it still across renders.
  const rollRef = useMemo(() => (name ? countUpNow(missing) : undefined), [name, missing]);
  const base = cn("text-sm text-muted-foreground", className);
  if (hint) return <span className={base}>{hint}</span>;
  switch (state.kind) {
    case "none":
      return <span className={base}>Cada bairro abre quando a fila enche.</span>;
    case "withFirst":
      return (
        <span className={base}>
          <B>{state.name}</B> abre junto com o primeiro bairro que encher.
        </span>
      );
    case "full":
      return (
        <span className={base}>
          <B>{state.name}</B> já encheu a fila. O mapa abre em breve.
        </span>
      );
    case "missing":
      return (
        <span className={cn(base, "font-mono text-caption tabular-nums")}>
          <B>{state.name}</B>: faltam <B ref={rollRef}>{fmt(state.missing)}</B>{" "}
          {plural(state.missing, "inscrito", "inscritos")} para abrir.
        </span>
      );
  }
}
