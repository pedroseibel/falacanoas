import type { Item } from "@fala/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contestDecision, getDecision } from "@/server/moderation";

/**
 * What the author of a held or refused item sees on its page (round 5; round 18, Q31): why it's
 * waiting or why it wasn't published, and a way to contest a refusal. Only the author reaches this
 * page while the item isn't published (their session, or a guest's link).
 */
export function ModerationNotice({ it, trackingKey }: { it: Item; trackingKey: string | null }) {
  const queryClient = useQueryClient();
  const decision = useQuery({
    queryKey: ["item", it.id, "decision"],
    queryFn: () => getDecision({ data: it.id }),
    enabled: it.moderation === "rejected",
  });
  const [text, setText] = useState("");
  const contest = useMutation({
    mutationFn: () => contestDecision({ data: { itemId: it.id, key: trackingKey, text } }),
    onSuccess: (r) => {
      toast(r.ok ? "Contestação enviada. Outra pessoa da moderação vai olhar." : r.error);
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
        {it.moderation === "pending" ? "Em análise" : d?.status === "republish" ? "Publique assinado" : "Não publicado"}
      </h3>
      <p className="text-sm text-ink-2">
        {it.moderation === "pending"
          ? it.guest
            ? "Registros sem conta passam pela moderação antes de aparecer no mapa. Guarde o link desta página: é o jeito de acompanhar."
            : "A verificação automática segurou este registro para alguém olhar antes de publicar: ele pode ter um telefone, um CPF, o nome de uma pessoa ou uma ofensa. A decisão aparece aqui."
          : (d?.note ?? "A moderação não publicou este registro.")}
      </p>
      {it.moderation === "rejected" && d && !d.contest && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length < 10) return void toast("Conte em poucas palavras por que a decisão está errada.");
            contest.mutate();
          }}
        >
          <label htmlFor="contestar" className="text-sm font-medium">
            Contestar a decisão
          </label>
          <Textarea
            id="contestar"
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: o número no texto é o protocolo da Prefeitura, não um telefone."
          />
          <div>
            <Button type="submit" size="sm" disabled={contest.isPending}>
              {contest.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
              Enviar contestação
            </Button>
          </div>
        </form>
      )}
      {d?.contest === "open" && (
        <p className="text-xs text-muted-foreground">Sua contestação está com a moderação. Outra pessoa vai olhar.</p>
      )}
      {d?.contest === "upheld" && (
        <p className="text-xs text-muted-foreground">
          A contestação foi analisada, e a decisão ficou. O histórico diz o motivo.
        </p>
      )}
    </section>
  );
}
