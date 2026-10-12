import { isOpen, median, type Item, type Municipality, type Thread, type Viewer } from "@fala/core";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { Icon, categoryIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile, project } from "@/components/viz";
import { ItemCard } from "@/features/map/item-card";

export function BairroPage({
  slug,
  items,
  threads,
  muni,
  viewer,
  onBairro,
  onOpen,
}: {
  slug: string;
  items: Item[];
  threads: Thread[];
  muni: Municipality;
  viewer: Viewer;
  onBairro: (slug: string) => void;
  onOpen: (id: string) => void;
}) {
  const bairro = muni.neighborhoods.find((n) => n.slug === slug);
  const feature = muni.geo.neighborhoods.features.find((f) => f.properties.slug === slug);
  const mine = items.filter((i) => i.neighborhood === slug);
  const occurrences = mine.filter((i) => i.kind === "occurrence");
  const open = occurrences.filter(isOpen).toSorted((a, b) => b.days - a.days);
  const questions = mine.filter((i) => i.kind === "public_issue");
  const medianToFix = median(occurrences.filter((i) => !isOpen(i)).map((i) => i.days));
  const [threadId, setThreadId] = useState(threads[0]?.id ?? null);
  const [replies, setReplies] = useState<Record<string, Thread["replies"]>>({});
  const [draft, setDraft] = useState("");
  const thread = threads.find((t) => t.id === threadId) ?? threads[0];
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
              value={open.filter((i) => i.days > muni.deadlineDays).length}
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
                      <Icon name={categoryIcon("questao")} size={28} />
                      Nenhuma questão pública neste bairro ainda.
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="conversa">
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
                      <span className="flex gap-2.5 text-xs text-muted-foreground">
                        <span>{t.by}</span>
                        <span>{t.ago}</span>
                        <span>{t.replies.length + (replies[t.id]?.length ?? 0)} respostas</span>
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
            <div className="grid gap-1 p-4.5">
              <p className="text-xs text-muted-foreground">
                {thread.by} · {thread.ago}
              </p>
              <h3 className="text-xl leading-snug font-semibold tracking-tight">{thread.title}</h3>
              {[...thread.replies, ...(replies[thread.id] ?? [])].map((r) => (
                <div
                  key={`${r.by}|${r.ago}|${r.text}`}
                  className="flex gap-2.5 border-t border-hairline py-2.5 first-of-type:mt-2"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-panel-3 text-2xs font-semibold">
                    {r.by.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm">
                      <b className="font-semibold">{r.by}</b>{" "}
                      <span className="ml-1.5 text-xs text-muted-foreground">{r.ago}</span>
                    </p>
                    <p className="text-sm leading-relaxed text-ink-2">{r.text}</p>
                  </div>
                </div>
              ))}
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text) return;
                  setReplies((all) => ({
                    ...all,
                    [thread.id]: [...(all[thread.id] ?? []), { by: viewer.nick, ago: "agora", text }],
                  }));
                  setDraft("");
                }}
              >
                <Input
                  aria-label="Responder"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Responder para o bairro"
                  autoComplete="off"
                />
                <Button type="submit">Enviar</Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Críticas a serviços e órgãos são bem-vindas. Ataques a pessoas, não. Moderado por vizinhos do bairro.
              </p>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          )}
        </section>
      </div>
    </div>
  );
}
