import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mySanctionsQuery } from "@/features/voce/queries";
import { contestSanction, type MySanction } from "@/server/sanctions";

const until = (iso: string | null, timezone: string) =>
  iso ? ` até ${new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: timezone })}` : "";

/**
 * A mute or a suspension in force on this account (round 19): what it means, why, and one contest,
 * reviewed by someone other than whoever gave it. Only the person sees this; nothing about it is public.
 */
export function SanctionNotices({ timezone }: { timezone: string }) {
  const { data } = useQuery(mySanctionsQuery);
  if (!data?.length) return null;
  return data.map((s) => <SanctionNotice key={s.id} s={s} timezone={timezone} />);
}

function SanctionNotice({ s, timezone }: { s: MySanction; timezone: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const contest = useMutation({
    mutationFn: () => contestSanction({ data: { id: s.id, text: text.trim() } }),
    onSuccess: (r) => {
      toast(r.ok ? "Contestação enviada. Outra pessoa da moderação vai olhar." : r.error);
      if (r.ok) void queryClient.invalidateQueries({ queryKey: mySanctionsQuery.queryKey });
    },
  });
  const suspended = s.kind === "suspend";
  return (
    <section
      aria-labelledby={`sancao-${s.id}`}
      className="grid gap-3 rounded-2xl border border-dashed border-hairline-strong bg-card p-5"
    >
      <div className="grid gap-1">
        <h2 id={`sancao-${s.id}`} className="text-base font-semibold">
          {suspended ? "Conta suspensa" : "Conta silenciada"}
          {until(s.until, timezone)}
        </h2>
        <p className="text-sm text-pretty text-ink-2">
          {suspended
            ? "Você pode ler tudo e pedir seus dados, mas não pode registrar, confirmar, atualizar nem conversar."
            : "Seus registros e fotos passam pela moderação antes de aparecer. Atualizações e conversas ficam fechadas."}
        </p>
      </div>
      <p className="text-sm text-pretty">
        <b className="font-medium">Motivo:</b> {s.reason}
      </p>
      {s.contest === "open" ? (
        <p className="text-xs text-muted-foreground">Sua contestação está com a moderação. Outra pessoa vai olhar.</p>
      ) : s.contest === "upheld" ? (
        <p className="text-xs text-muted-foreground">A contestação foi analisada, e a sanção ficou.</p>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length < 10) return void toast("Conte em poucas palavras por que a sanção está errada.");
            contest.mutate();
          }}
        >
          <label htmlFor={`contestar-sancao-${s.id}`} className="text-sm font-medium">
            Contestar
          </label>
          <Textarea
            id={`contestar-sancao-${s.id}`}
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: as fotos removidas mostravam só o buraco; ninguém dava para reconhecer."
          />
          <div>
            <Button type="submit" size="sm" disabled={contest.isPending}>
              {contest.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
              Enviar contestação
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
