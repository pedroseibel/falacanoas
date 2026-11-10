import { bairroName } from "@fala/core";
import type { Municipality } from "@fala/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { textLink } from "@/components/text-link";
import { moderationStandingQuery } from "@/features/moderation/queries";
import { applyToModerate } from "@/server/volunteers";

const NOTE_MAX = 280;

/**
 * "Ajudar a moderar" (moderation capacity): a member offers to moderate some bairros; the operator
 * decides. Shown to members who don't moderate yet. The guide is public, so anyone can read it first.
 */
export function VolunteerCard({ muni, home }: { muni: Municipality; home: string | null }) {
  const queryClient = useQueryClient();
  const { data: standing } = useQuery(moderationStandingQuery);
  const [open, setOpen] = useState(false);
  const [bairros, setBairros] = useState<string[]>(home ? [home] : []);
  const [note, setNote] = useState("");
  const apply = useMutation({
    mutationFn: () => applyToModerate({ data: { neighborhoods: bairros, note: note.trim() || undefined } }),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      setOpen(false);
      toast("Pedido enviado. A equipe responde por aqui.");
      void queryClient.invalidateQueries({ queryKey: moderationStandingQuery.queryKey });
    },
    onError: () => toast("Não deu para enviar agora. Confira a conexão e tente de novo."),
  });
  if (!standing || standing.moderator) return null;
  const app = standing.application;
  const names = (slugs: string[]) => slugs.map((s) => bairroName(muni, s) ?? s).join(", ");

  return (
    <section className="grid gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-soft" aria-labelledby="vol-t">
      <h2 id="vol-t" className="text-sm font-semibold">
        Ajudar a moderar
      </h2>
      {app?.status === "pending" ? (
        <p className="text-sm text-pretty text-ink-2">
          Seu pedido para moderar {names(app.neighborhoods)} está com a equipe. Enquanto isso, leia o{" "}
          <a href="/moderacao" className={textLink}>
            guia da moderação
          </a>
          .
        </p>
      ) : !open ? (
        <>
          <p className="text-sm text-pretty text-ink-2">
            Moderadores olham as fotos novas e as denúncias do bairro antes de tudo aparecer. São alguns minutos, quando
            você puder. As regras estão no{" "}
            <a href="/moderacao" className={textLink}>
              guia da moderação
            </a>
            .
          </p>
          {app?.status === "declined" && (
            <p className="text-caption text-muted-foreground">Seu último pedido não foi aceito desta vez.</p>
          )}
          <Button variant="outline" className="justify-self-start" onClick={() => setOpen(true)}>
            Quero ajudar
          </Button>
        </>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!bairros.length) return void toast("Escolha pelo menos um bairro.");
            apply.mutate();
          }}
        >
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm text-ink-2">Quais bairros?</legend>
            <ToggleGroup
              variant="outline"
              size="sm"
              multiple
              value={bairros}
              onValueChange={setBairros}
              className="flex-wrap"
            >
              {muni.neighborhoods.map((n) => (
                <ToggleGroupItem key={n.slug} value={n.slug}>
                  {n.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>
          <label className="grid gap-2 text-sm text-ink-2">
            Por que você quer ajudar? (opcional)
            <Textarea value={note} maxLength={NOTE_MAX} rows={3} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="default" disabled={apply.isPending}>
              Enviar pedido
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
