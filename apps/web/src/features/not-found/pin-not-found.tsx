import { Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GhostPin } from "./ghost-pin";

/**
 * A pin's address that opens nothing, inside the map's detail panel (or the phone's sheet): where
 * its photo would be, a dashed slot with the code; then the likely reasons, and the way back.
 */
export function PinNotFound({ code, onClose }: { code: string; onClose: () => void }) {
  const shown = code.length > 12 ? `${code.slice(0, 11)}…` : code.toUpperCase();
  return (
    <div className="grid gap-6 p-5 pt-16 pb-8">
      <div className="grid aspect-4/3 place-content-center max-phone:aspect-video justify-items-center gap-3.5 rounded-xl border border-dashed border-foreground/20 bg-muted">
        <GhostPin />
        <span className="font-mono text-sm tracking-wide text-muted-foreground">{shown}</span>
      </div>
      <div className="grid gap-2.5">
        <h2 className="text-heading font-semibold text-balance">Não encontramos este registro.</h2>
        <p className="text-ui text-pretty text-ink-2">Confira o código no link: são 5 letras e números.</p>
        <p className="text-ui text-pretty text-ink-2">
          Se ele estiver certo, o registro pode ter sido retirado pela moderação, ou ainda estar em análise. Nesse caso,
          só quem registrou consegue abrir, pelo link de acompanhamento.
        </p>
      </div>
      <Button variant="outline" size="lg" className="justify-self-start" onClick={onClose}>
        <MapIcon aria-hidden="true" />
        Voltar ao mapa
      </Button>
    </div>
  );
}
