import { FLAG_LABEL, type Municipality } from "@fala/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryLine } from "@/components/category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { whereOf } from "@/features/map/item-card";
import { moderationQueueQuery } from "@/lib/city";
import { decideCase, resolveContest, type QueueCase } from "@/server/moderation";

const panel = "grid gap-4 rounded-2xl border border-hairline bg-card p-4 shadow-soft";

/**
 * /moderar (DECISIONS round 5; round 18, Q19 and Q31): what the pre-screen held and every guest pin,
 * for volunteer moderators. Nobody here sees who posted: a random handle per item and, at most, how
 * many of that author's posts were refused before.
 */
export function ModerationPage({ cases, muni }: { cases: QueueCase[]; muni: Municipality }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-7 pt-8 pb-16 max-phone:px-4 max-phone:pt-5 max-phone:pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Moderação</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Registros esperando alguém olhar. Você não vê quem publicou: só um código por registro. Cada decisão entra no
          histórico do registro, e quem publicou pode contestar.
        </p>
      </header>
      {cases.length ? (
        cases.map((c) => <Case key={c.id} c={c} muni={muni} />)
      ) : (
        <p className={`${panel} text-center text-sm text-muted-foreground`}>
          Nada esperando. Obrigado por cuidar do bairro.
        </p>
      )}
    </div>
  );
}

function Case({ c, muni }: { c: QueueCase; muni: Municipality }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<null | "reject" | "republish" | "uphold" | "overturn">(null);
  const [note, setNote] = useState("");
  const done = () => void queryClient.invalidateQueries({ queryKey: moderationQueueQuery.queryKey });
  const decide = useMutation({
    mutationFn: (d: Parameters<typeof decideCase>[0]["data"]) => decideCase({ data: d }),
    onSuccess: (r) => {
      toast(r.ok ? "Decisão registrada." : r.error);
      if (r.ok) done();
    },
  });
  const contest = useMutation({
    mutationFn: (overturn: boolean) => resolveContest({ data: { caseId: c.id, overturn, note } }),
    onSuccess: (r) => {
      toast(r.ok ? "Contestação analisada." : r.error);
      if (r.ok) done();
    },
  });
  const busy = decide.isPending || contest.isPending;
  const photo = c.item.photos[0];
  const contested = Boolean(c.contest);

  const submitNote = () => {
    if (note.trim().length < 3) return void toast("Escreva o motivo: ele aparece para quem publicou.");
    if (step === "reject" || step === "republish") decide.mutate({ caseId: c.id, decision: step, note: note.trim() });
    if (step === "uphold" || step === "overturn") contest.mutate(step === "overturn");
  };

  return (
    <article className={panel} aria-labelledby={`caso-${c.id}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{c.reason === "guest_pin" ? "Registro sem conta" : "Verificação automática"}</Badge>
        {c.flags.map((f) => (
          <Badge key={f} variant="secondary">
            {FLAG_LABEL[f]}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Autor <span className="font-mono">{c.handle}</span>
          {c.priorRefusals > 0 && ` · ${c.priorRefusals} ${c.priorRefusals === 1 ? "recusa" : "recusas"} antes`}
        </span>
      </div>

      <div className="flex gap-3.5">
        {photo && (
          <img src={photo.src} alt="" className="size-24 shrink-0 rounded-lg border border-hairline object-cover" />
        )}
        <div className="grid min-w-0 content-start gap-1">
          <CategoryLine muni={muni} category={c.item.category} where={whereOf(c.item, muni)} />
          <h2 id={`caso-${c.id}`} className="text-base leading-snug font-semibold">
            {c.item.title}
          </h2>
          {c.item.text && <p className="text-sm leading-relaxed text-ink-2">{c.item.text}</p>}
          <p className="text-xs text-muted-foreground">
            Código {c.item.id} ·{" "}
            {c.item.visibility === "anonymous" ? "Anônimo em público" : `por ${c.item.author ?? "—"}`}
          </p>
        </div>
      </div>

      {c.contest && (
        <section className="grid gap-1 rounded-xl border border-dashed border-hairline-strong p-3">
          <h3 className="text-sm font-semibold">Contestação</h3>
          {c.decided?.note && <p className="text-xs text-muted-foreground">Decisão: {c.decided.note}</p>}
          <p className="text-sm text-ink-2">“{c.contest.text}”</p>
        </section>
      )}

      {step && (
        <div className="grid gap-2">
          <label htmlFor={`nota-${c.id}`} className="text-sm font-medium">
            {step === "republish" ? "O que pedir a quem publicou" : step === "overturn" ? "Por que publicar" : "Motivo"}
          </label>
          <Textarea
            id={`nota-${c.id}`}
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              step === "republish"
                ? "Ex.: propaganda eleitoral não sai como Anônimo; publique assinado com seu apelido."
                : "Ex.: o texto tem o telefone de uma pessoa."
            }
          />
          <p className="text-xs text-muted-foreground">Aparece para quem publicou e no histórico do registro.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step ? (
          <>
            <Button size="sm" disabled={busy} onClick={submitNote}>
              {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
              {step === "reject"
                ? "Recusar"
                : step === "republish"
                  ? "Pedir republicação"
                  : step === "overturn"
                    ? "Publicar"
                    : "Manter a decisão"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(null)}>
              Cancelar
            </Button>
          </>
        ) : contested && c.decidedByYou ? (
          <p className="text-xs text-muted-foreground">
            Você decidiu este caso: a contestação fica para outra pessoa da moderação.
          </p>
        ) : contested ? (
          <>
            <Button size="sm" onClick={() => setStep("overturn")}>
              Aceitar e publicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep("uphold")}>
              Manter a decisão
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => decide.mutate({ caseId: c.id, decision: "publish" })}>
              {decide.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
              Publicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStep("reject")}>
              Recusar
            </Button>
            {c.flags.includes("electoral") && c.item.visibility === "anonymous" && (
              <Button size="sm" variant="outline" onClick={() => setStep("republish")}>
                Pedir assinatura
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
