import { MUTE_DAYS, SUSPEND_DAYS, type SanctionKind } from "@fala/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sanctionQueueQuery } from "@/lib/city";
import { QueueRow, useLeave } from "./leave";
import { decideSuspension, resolveSanctionContest, sanctionFromCase, type QueueSanction } from "@/server/sanctions";

const panel = "grid gap-4 rounded-2xl border border-hairline bg-card p-4 shadow-soft";

const KIND_LABEL: Record<SanctionKind, string> = { mute: "Silenciada", suspend: "Suspensa" };
const SOURCE_LABEL: Record<QueueSanction["source"], string> = {
  auto: "automática",
  moderator: "da moderação",
  controller: "do controlador",
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "sem prazo";

/**
 * Under a case: the account that sent its content, by what it did, never by who it is (round 19).
 * Muting is mild and starts now; a suspension waits for another moderator.
 */
export function SanctionActions({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<SanctionKind | null>(null);
  const [reason, setReason] = useState("");
  const act = useMutation({
    mutationFn: (k: SanctionKind) => sanctionFromCase({ data: { caseId, kind: k, reason: reason.trim() } }),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      toast(r.proposed ? "Suspensão proposta: outra pessoa da moderação confirma." : "Conta silenciada por 30 dias.");
      setKind(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: sanctionQueueQuery.queryKey });
    },
  });
  if (!kind)
    return (
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-hairline pt-3 text-xs text-muted-foreground">
        <span className="mr-1">Conta de quem enviou:</span>
        <Button size="xs" variant="ghost" onClick={() => setKind("mute")}>
          Silenciar {MUTE_DAYS} dias
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setKind("suspend")}>
          Propor suspensão
        </Button>
      </div>
    );
  return (
    <div className="grid gap-2 border-t border-hairline pt-3">
      <label htmlFor={`sancao-${caseId}`} className="text-sm font-medium">
        {kind === "mute"
          ? `Silenciar por ${MUTE_DAYS} dias: registros e fotos passam pela moderação; atualizações e conversas fecham`
          : `Propor suspensão de ${SUSPEND_DAYS} dias: outra pessoa da moderação confirma`}
      </label>
      <Textarea
        id={`sancao-${caseId}`}
        value={reason}
        maxLength={280}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ex.: publicou fotos de pessoas depois de pedidos para não publicar."
      />
      <p className="text-caption text-muted-foreground">
        O motivo aparece só para a pessoa, que pode contestar. Nunca é público.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={act.isPending || reason.trim().length < 3}
          onClick={() => act.mutate(kind)}
        >
          {act.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          {kind === "mute" ? "Silenciar" : "Propor suspensão"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setKind(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** A suspension waiting for a second moderator, or a contested sanction waiting for review. */
export function SanctionCard({ s }: { s: QueueSanction }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const { leaving, leave } = useLeave();
  const done = (message: string) => {
    toast(message);
    leave(() => void queryClient.invalidateQueries({ queryKey: sanctionQueueQuery.queryKey }));
  };
  const confirm = useMutation({
    mutationFn: (yes: boolean) =>
      decideSuspension({ data: { id: s.id, confirm: yes, note: note.trim() || undefined } }),
    onSuccess: (r, yes) => (r.ok ? done(yes ? "Suspensão confirmada." : "Suspensão recusada.") : toast(r.error)),
  });
  const review = useMutation({
    mutationFn: (lift: boolean) => resolveSanctionContest({ data: { id: s.id, lift, note: note.trim() } }),
    onSuccess: (r, lift) => (r.ok ? done(lift ? "Sanção retirada." : "Sanção mantida.") : toast(r.error)),
  });
  const busy = confirm.isPending || review.isPending;
  const contest = s.waiting === "contest";
  return (
    <QueueRow leaving={leaving}>
      <article className={panel} aria-label={`Sanção ${s.handle}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{contest ? `${KIND_LABEL[s.kind]} · contestação` : "Suspensão a confirmar"}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            Conta <span className="font-mono">{s.handle}</span> ·{" "}
            <span className="tabular-nums">{s.recentRemovals}</span> {s.recentRemovals === 1 ? "remoção" : "remoções"}{" "}
            em 30 dias
          </span>
        </div>
        <div className="grid gap-1">
          <p className="text-sm text-pretty">{s.reason}</p>
          <p className="text-xs text-muted-foreground">
            Sanção {SOURCE_LABEL[s.source]} · {contest ? `até ${day(s.until)}` : "90 dias a partir da confirmação"}
          </p>
        </div>
        {s.contest && (
          <section className="grid gap-1 rounded-xl border border-dashed border-hairline-strong p-3">
            <h3 className="text-sm font-semibold">Contestação</h3>
            <p className="text-sm text-pretty text-ink-2">“{s.contest.text}”</p>
          </section>
        )}
        <div className="grid gap-2">
          <label htmlFor={`sancao-nota-${s.id}`} className="text-sm font-medium">
            {contest ? "Motivo da decisão" : "Nota (opcional)"}
          </label>
          <Textarea
            id={`sancao-nota-${s.id}`}
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder={contest ? "Aparece para a pessoa." : "Ex.: as remoções foram por fotos ruins, não por abuso."}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {contest ? (
            <>
              <Button size="sm" disabled={busy || note.trim().length < 3} onClick={() => review.mutate(true)}>
                Retirar a sanção
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || note.trim().length < 3}
                onClick={() => review.mutate(false)}
              >
                Manter
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => confirm.mutate(true)}>
                Confirmar suspensão
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => confirm.mutate(false)}>
                Recusar
              </Button>
            </>
          )}
        </div>
      </article>
    </QueueRow>
  );
}
