import { Map as MapIcon, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Go } from "./off-map";
import { StandaloneFrame } from "./standalone-frame";

const TITLE = "Algo falhou do nosso lado.";
const BODY = "Não foi nada que você fez. Tente de novo; se continuar, volte daqui a pouco.";

/** In development, what broke; never in production, where the message may carry internals. */
function Detail({ error }: { error: unknown }) {
  if (!import.meta.env.DEV || !(error instanceof Error)) return null;
  return (
    <pre className="max-h-40 overflow-auto rounded-lg border border-dashed border-hairline-strong bg-muted p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
      {error.message}
    </pre>
  );
}

/** A failure inside a part of a page (the detail panel, a section): it says so in place, and retries. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="grid content-start gap-5 p-5 pt-16 pb-8">
      <div className="grid gap-2.5">
        <h2 className="text-heading font-semibold text-balance">{TITLE}</h2>
        <p className="text-ui text-pretty text-ink-2">{BODY}</p>
      </div>
      <Detail error={error} />
      <Button variant="outline" size="lg" className="justify-self-start" onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}

/** A failure of the whole page, before anything could be drawn. */
export function ErrorPage({ error, onRetry, go }: { error: unknown; onRetry: () => void; go: Go }) {
  const map = go("/mapa");
  return (
    <StandaloneFrame go={go}>
      <div role="alert" className="grid max-w-auth content-start gap-8">
        <div className="grid gap-3.5">
          <h1 className="text-title font-semibold text-balance">{TITLE}</h1>
          <p className="text-lede text-pretty text-ink-2">{BODY}</p>
        </div>
        <Detail error={error} />
        <div className="flex flex-wrap gap-3 max-compact:grid">
          <Button variant="signal" size="xl" onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            Tentar de novo
          </Button>
          <Button variant="outline" size="xl" nativeButton={false} render={<a href={map.href} onClick={map.onClick} />}>
            <MapIcon aria-hidden="true" />
            Abrir o mapa
          </Button>
        </div>
      </div>
    </StandaloneFrame>
  );
}
