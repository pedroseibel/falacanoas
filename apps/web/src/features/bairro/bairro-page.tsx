import { isOpen, isOverDeadline, type Item, median, type Municipality, type Thread } from "@fala/core";
import { MessageSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile, project } from "@/components/viz";
import { ThreadView } from "@/features/forum/thread-view";
import { ItemCard } from "@/components/item-card";
import { threadsQuery } from "@/features/forum/queries";
import { replyToThread, startThread } from "@/server/forum";

export function BairroPage({
  slug,
  items,
  threads,
  muni,
  onBairro,
  onOpen,
  member,
  onSignIn,
}: {
  slug: string;
  items: Item[];
  threads: Thread[];
  muni: Municipality;
  onBairro: (slug: string) => void;
  onOpen: (id: string) => void;
  /** Signed in with an apelido: can post. */
  member: boolean;
  onSignIn: () => void;
}) {
  const queryClient = useQueryClient();
  const bairro = muni.neighborhoods.find((n) => n.slug === slug);
  const feature = muni.geo.neighborhoods.features.find((f) => f.properties.slug === slug);
  const mine = items.filter((i) => i.neighborhood === slug);
  const occurrences = mine.filter((i) => i.kind === "occurrence");
  const open = occurrences.filter(isOpen).toSorted((a, b) => b.days - a.days);
  const questions = mine.filter((i) => i.kind === "public_issue");
  const medianToFix = median(occurrences.filter((i) => !isOpen(i)).map((i) => i.days));
  const [threadId, setThreadId] = useState(threads[0]?.id ?? null);
  const [topic, setTopic] = useState("");
  const thread = threads.find((t) => t.id === threadId) ?? threads[0];
  const keep = (next: Thread[]) => queryClient.setQueryData(threadsQuery(slug).queryKey, next);
  const reply = async (text: string) => {
    if (!thread) return false;
    const r = await replyToThread({ data: { threadId: thread.id, text } }).catch(() => null);
    if (!r?.ok) {
      toast(r?.error ?? "Não deu para enviar agora. Tente de novo.");
      return false;
    }
    keep(threads.map((t) => (t.id === r.thread.id ? r.thread : t)));
    return true;
  };
  const openTopic = useMutation({
    mutationFn: (title: string) => startThread({ data: { neighborhood: slug, title } }),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      keep(r.threads);
      setThreadId(r.threads[0]?.id ?? null);
      setTopic("");
    },
    onError: () => toast("Não deu para abrir o tópico agora. Tente de novo."),
  });
  const outline = feature ? project([feature], 200) : null;
  const names = Object.fromEntries(muni.neighborhoods.map((n) => [n.slug, n.name]));
  if (!bairro) return null;

  return (
    <div className="mx-auto grid max-w-295 gap-5 px-7 pt-8 pb-16 max-phone:px-4 max-phone:pt-5 max-phone:pb-24">
      <Select
        items={names}
        value={slug}
        onValueChange={(v) => {
          if (typeof v === "string") onBairro(v);
        }}
      >
        <SelectTrigger aria-label="Bairro" className="w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {muni.neighborhoods.map((n) => (
            <SelectItem key={n.slug} value={n.slug}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-12 items-start gap-5 max-split:grid-cols-1">
        <section className="col-span-7 overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft max-split:col-span-1">
          <header className="flex items-center justify-between gap-4 p-4.5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{bairro.name}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {bairro.threshold
                  ? `Mapa aberto · fila de ${bairro.threshold} vizinhos completa (exemplo)`
                  : "Poucos moradores: abriu junto com o primeiro bairro"}
              </p>
            </div>
            {outline && feature && (
              <svg
                viewBox={`-10 -10 ${outline.W + 20} ${outline.H + 20}`}
                className="h-24 w-32 shrink-0"
                aria-hidden="true"
              >
                <path
                  d={outline.path(feature)}
                  vectorEffect="non-scaling-stroke"
                  className="fill-signal-wash stroke-signal stroke-2"
                />
              </svg>
            )}
          </header>
          <div className="grid grid-cols-4 divide-x divide-hairline border-y border-hairline max-phone:grid-cols-2">
            <StatTile value={open.length} label="abertos" />
            <StatTile
              value={open.filter((i) => isOverDeadline(i, muni.deadlineDays)).length}
              label={`há mais de ${muni.deadlineDays} dias`}
              attention
            />
            <StatTile value={medianToFix} label="mediana até o conserto" />
            <StatTile value={questions.length} label="questões públicas" />
          </div>
          <div className="p-2.5">
            <Tabs defaultValue="registros">
              <TabsList>
                <TabsTrigger value="registros">Registros</TabsTrigger>
                <TabsTrigger value="questoes">Questões públicas</TabsTrigger>
                <TabsTrigger value="conversa">Conversa</TabsTrigger>
              </TabsList>
              <TabsContent value="registros">
                <div className="grid gap-0.5 pt-2">
                  {open.length ? (
                    open
                      .slice(0, 30)
                      .map((it) => <ItemCard key={it.id} it={it} muni={muni} selected={false} onOpen={onOpen} />)
                  ) : (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      Nenhum registro aberto neste bairro.
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="questoes">
                <div className="grid gap-0.5 pt-2">
                  {questions.length ? (
                    questions.map((it) => <ItemCard key={it.id} it={it} muni={muni} selected={false} onOpen={onOpen} />)
                  ) : (
                    <p className="grid justify-items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                      <Icon name={categoryIcon("questao")} size={32} />
                      Nenhuma questão pública neste bairro ainda.
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="conversa">
                <form
                  className="flex gap-2 pt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!member) return onSignIn();
                    if (topic.trim().length >= 8) openTopic.mutate(topic.trim());
                    else toast("Escreva o assunto em uma frase.");
                  }}
                >
                  <Input
                    aria-label="Assunto do novo tópico"
                    value={topic}
                    maxLength={160}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex.: a coleta de lixo mudou de dia?"
                    autoComplete="off"
                  />
                  <Button type="submit" variant="outline" disabled={openTopic.isPending}>
                    Abrir tópico
                  </Button>
                </form>
                <div className="grid pt-2">
                  {threads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-current={t.id === thread?.id}
                      onClick={() => setThreadId(t.id)}
                      className="grid gap-1 border-t border-hairline px-3 py-3.5 text-left first:border-t-0 hover:bg-muted aria-[current=true]:bg-muted"
                    >
                      <span className="text-sm leading-snug font-semibold">{t.title}</span>
                      <span className="flex min-h-4.5 items-center gap-2.5 text-xs text-muted-foreground">
                        <span>{t.by}</span>
                        <span>{t.ago}</span>
                        <span>
                          {t.replies.length} {t.replies.length === 1 ? "resposta" : "respostas"}
                        </span>
                        {t.demo && <Badge variant="chip-inline">exemplo</Badge>}
                      </span>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section
          className="col-span-5 overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft max-split:col-span-1"
          aria-labelledby="conv-t"
        >
          <h2 id="conv-t" className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-semibold">
            <MessageSquare className="size-4" />
            Conversa do bairro <span className="font-normal text-muted-foreground">{threads.length} tópicos</span>
          </h2>
          {thread ? (
            <div className="p-4.5">
              <ThreadView
                key={thread.id}
                thread={thread}
                heading
                member={member}
                onSignIn={onSignIn}
                onReply={reply}
                placeholder="Responder para o bairro"
              />
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda. Abra o primeiro tópico do bairro.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
