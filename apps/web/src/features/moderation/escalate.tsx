import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moderationQueueQuery } from "@/lib/city";
import { escalateChildAbuse } from "@/server/content-reports";

/** What a moderator reads before handing child abuse material on (round 20). */
export const ESCALATE_EXPLAINED =
  "Sai do ar na hora e fica guardado só para as autoridades: ninguém mais consegue ver, nem a moderação. A conta de quem enviou é suspensa. Não baixe, não copie, não tire print e não mostre a ninguém: a equipe responsável faz a denúncia.";

/** The same, for the narrow column under a photo in the queue. */
const ESCALATE_SHORT = "Sai do ar e fica só para as autoridades; a conta é suspensa. Não baixe nem mostre a ninguém.";

/**
 * "Abuso sexual infantil" under a case: two steps, so it's never one slip of the finger, and nothing
 * to look at afterwards. The material leaves the queue for the controller's hands.
 */
export function EscalateAction({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const send = useMutation({
    mutationFn: () => escalateChildAbuse({ data: { caseId } }),
    onSuccess: (r) => {
      toast(r.ok ? "Removido e encaminhado à equipe responsável." : r.error);
      if (r.ok) void queryClient.invalidateQueries({ queryKey: moderationQueueQuery.queryKey });
    },
  });
  if (!open)
    return (
      <Button size="xs" variant="ghost" className="justify-self-start" onClick={() => setOpen(true)}>
        <ShieldAlert data-icon="inline-start" aria-hidden="true" />
        {compact ? "Abuso infantil" : "É abuso sexual infantil"}
      </Button>
    );
  return (
    <div
      role="alertdialog"
      aria-label="Encaminhar como abuso sexual infantil"
      className="grid gap-2.5 rounded-xl border border-dashed border-hairline-strong p-3"
    >
      <p className="text-sm text-pretty text-ink-2">{compact ? ESCALATE_SHORT : ESCALATE_EXPLAINED}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={send.isPending} onClick={() => send.mutate()}>
          {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Remover e encaminhar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
