import type { Item } from "@fala/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contestDecision, getDecision, getMyRemovals, type Removal } from "@/server/moderation";

const SENT = "Contestação enviada. Outra pessoa da moderação vai olhar.";

/** Why a decision is wrong, in a few words; someone other than whoever decided reads it. */
function ContestForm({
  id,
  placeholder,
  pending,
  onSend,
}: {
  id: string;
  placeholder: string;
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 10) return void toast("Conte em poucas palavras por que a decisão está errada.");
        onSend(text);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        Contestar a decisão
      </label>
      <Textarea
        id={id}
        value={text}
        maxLength={600}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
      />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Enviar contestação
        </Button>
      </div>
    </form>
  );
}

function ContestState({ contest }: { contest: Removal["contest"] }) {
  if (contest === "open")
    return (
      <p className="text-xs text-muted-foreground">Sua contestação está com a moderação. Outra pessoa vai olhar.</p>
    );
  if (contest === "upheld")
    return (
      <p className="text-xs text-muted-foreground">
        A contestação foi analisada, e a decisão ficou. O histórico diz o motivo.
      </p>
    );
  return null;
}

/**
 * What the author of a held, refused or taken-down item sees on its page (round 5; round 18, Q31):
 * why it's waiting or why it's out, and a way to contest. Only the author reaches this page while the
 * item isn't published (their session, or a guest's link).
 */
export function ModerationNotice({ it, trackingKey }: { it: Item; trackingKey: string | null }) {
  const queryClient = useQueryClient();
  const decision = useQuery({
    queryKey: ["item", it.id, "decision"],
    queryFn: () => getDecision({ data: it.id }),
    enabled: it.moderation === "rejected",
  });
  const contest = useMutation({
    mutationFn: (text: string) => contestDecision({ data: { itemId: it.id, key: trackingKey, text } }),
    onSuccess: (r) => {
      toast(r.ok ? SENT : r.error);
      if (r.ok) void queryClient.invalidateQueries({ queryKey: ["item", it.id, "decision"] });
    },
  });
  const d = decision.data;

  return (
    <section
      aria-labelledby="analise"
      className="grid gap-2 rounded-xl border border-dashed border-hairline-strong p-3.5"
    >
      <h3 id="analise" className="text-sm font-semibold">
        {it.moderation === "pending"
          ? "Em análise"
          : d?.status === "republish"
            ? "Publique assinado"
            : d?.takenDown
              ? "Retirado do mapa"
              : "Não publicado"}
      </h3>
      <p className="text-sm text-ink-2">
        {it.moderation === "pending"
          ? it.guest
            ? "Registros sem conta passam pela moderação antes de aparecer no mapa. Guarde o link desta página: é o jeito de acompanhar."
            : "A verificação automática segurou este registro para alguém olhar antes de publicar: ele pode ter um telefone, um CPF, o nome de uma pessoa ou uma ofensa. A decisão aparece aqui."
          : (d?.note ?? "A moderação não publicou este registro.")}
      </p>
      {it.moderation === "rejected" && d && !d.contest && (
        <ContestForm
          id="contestar"
          placeholder="Ex.: o número no texto é o protocolo da Prefeitura, não um telefone."
          pending={contest.isPending}
          onSend={(text) => contest.mutate(text)}
        />
      )}
      <ContestState contest={d?.contest ?? null} />
    </section>
  );
}

/**
 * Photos and updates of yours that moderation removed from this item: the reason, and a way to
 * contest each one. Nobody else sees this.
 */
export function RemovalNotices({ it }: { it: Item }) {
  const queryClient = useQueryClient();
  const key = ["item", it.id, "removals"];
  const removals = useQuery({ queryKey: key, queryFn: () => getMyRemovals({ data: it.id }), staleTime: 30_000 });
  const contest = useMutation({
    mutationFn: ({ caseId, text }: { caseId: string; text: string }) =>
      contestDecision({ data: { itemId: it.id, key: null, caseId, text } }),
    onSuccess: (r) => {
      toast(r.ok ? SENT : r.error);
      if (r.ok) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  if (!removals.data?.length) return null;
  return removals.data.map((r) => (
    <section
      key={r.caseId}
      aria-labelledby={`remocao-${r.caseId}`}
      className="grid gap-2 rounded-xl border border-dashed border-hairline-strong p-3.5"
    >
      <h3 id={`remocao-${r.caseId}`} className="text-sm font-semibold">
        {r.target === "photo" ? "A moderação removeu uma foto sua" : "A moderação removeu uma atualização sua"}
      </h3>
      {r.note && <p className="text-sm text-ink-2">{r.note}</p>}
      {r.contest ? (
        <ContestState contest={r.contest} />
      ) : (
        <ContestForm
          id={`contestar-${r.caseId}`}
          placeholder={
            r.target === "photo"
              ? "Ex.: a foto mostra só o buraco; a pessoa ao fundo não dá para reconhecer."
              : "Ex.: falei do problema da rua, não de uma pessoa."
          }
          pending={contest.isPending}
          onSend={(text) => contest.mutate({ caseId: r.caseId, text })}
        />
      )}
    </section>
  ));
}
