import { FLAG_LABEL, LIKELY_NUDE, REPORT_REASON, shieldsModerator, type Municipality } from "@fala/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CategoryLine } from "@/components/category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { textLink } from "@/features/landing/bits";
import { whereOf } from "@/features/map/item-card";
import { moderationQueueQuery, reportedPostsQuery } from "@/lib/city";
import { cn } from "@/lib/utils";
import { decidePost, type ReportedPost } from "@/server/forum";
import { decideCase, resolveContest, type QueueCase, type QueuePhoto, type ReportSummary } from "@/server/moderation";
import { type QueueSanction } from "@/server/sanctions";
import { emptyRemoval, RemovalNote, type Removal } from "./removal-note";
import { EscalateAction } from "./escalate";
import { QueueRow, useLeave } from "./leave";
import { SanctionActions, SanctionCard } from "./sanction-cards";

const panel = "grid gap-4 rounded-2xl border border-hairline bg-card p-4 shadow-soft";

type PhotoCase = Extract<QueueCase, { target: "photo" }>;

/** Photos waiting for their first look, one group per pin: they arrive together and are judged together. */
function firstLooks(cases: QueueCase[]): { itemId: string; cases: PhotoCase[] }[] {
  const groups = new Map<string, PhotoCase[]>();
  for (const c of cases)
    if (c.target === "photo" && c.reason === "photo" && !c.decided)
      groups.set(c.item.id, [...(groups.get(c.item.id) ?? []), c]);
  return [...groups].map(([itemId, list]) => ({ itemId, cases: list }));
}

/**
 * /moderar (DECISIONS round 5; round 18, Q19 and Q31; the abuse review of 2026-10-13): reports first,
 * nudity and children at the top; contests; pins held before going public; then every new photo's
 * first look. Nobody here sees who posted: a random handle and, at most, how many of that person's
 * posts were refused before.
 */
/**
 * Photos nobody can see yet: each is compared with known abuse material before it reaches this queue
 * (BUILD 5.8). Usually a matter of seconds; past an hour, something is stuck and someone should know.
 */
function AwaitingCheck({ count, oldestMinutes }: { count: number; oldestMinutes: number }) {
  const stuck = oldestMinutes >= 60;
  return (
    <p className={cn(panel, "text-sm text-pretty text-muted-foreground")} role="status">
      {count === 1 ? "1 foto nova aguarda" : `${count} fotos novas aguardam`} a verificação automática de material de
      abuso conhecido e {count === 1 ? "aparece" : "aparecem"} aqui quando ela terminar.
      {stuck &&
        ` A mais antiga espera há ${oldestMinutes >= 120 ? `${Math.floor(oldestMinutes / 60)} horas` : "mais de uma hora"}: avise quem cuida do Fala.`}
    </p>
  );
}

export function ModerationPage({
  cases,
  posts,
  sanctions,
  awaiting,
  muni,
}: {
  cases: QueueCase[];
  posts: ReportedPost[];
  sanctions: QueueSanction[];
  /** New photos still waiting for the known-material check, out of everyone's sight. */
  awaiting: { count: number; oldestMinutes: number } | null;
  muni: Municipality;
}) {
  const reports = cases.filter((c) => !c.contest && (c.reason === "report" || c.reason === "takedown"));
  const contests = cases.filter((c) => c.contest);
  const held = cases.filter(
    (c) => !c.contest && (c.reason === "guest_pin" || c.reason === "prescreen" || c.reason === "muted"),
  );
  const photos = firstLooks(cases.filter((c) => !c.contest));
  const empty = !cases.length && !posts.length && !sanctions.length && !awaiting?.count;
  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-7 pt-8 pb-16 max-phone:px-4 max-phone:pt-5 max-phone:pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Moderação</h1>
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
          Denúncias, registros e fotos esperando alguém olhar. Você não vê quem publicou nem quem denunciou: só um
          código. Cada remoção entra no histórico do registro, e quem publicou pode contestar.
        </p>
      </header>
      {empty && (
        <p className={cn(panel, "text-center text-sm text-muted-foreground")}>
          Nada esperando. Obrigado por cuidar do bairro.
        </p>
      )}
      <Section id="denuncias-conteudo" title="Denúncias" count={reports.length}>
        {reports.map((c) => (
          <CaseCard key={c.id} c={c} muni={muni} />
        ))}
      </Section>
      <Section id="contestacoes" title="Contestações" count={contests.length}>
        {contests.map((c) => (
          <CaseCard key={c.id} c={c} muni={muni} />
        ))}
      </Section>
      <Section id="sancoes" title="Sanções" count={sanctions.length}>
        {sanctions.map((s) => (
          <SanctionCard key={s.id} s={s} />
        ))}
      </Section>
      <Section id="em-analise" title="Registros em análise" count={held.length}>
        {held.map((c) => (
          <CaseCard key={c.id} c={c} muni={muni} />
        ))}
      </Section>
      <Section id="fotos-novas" title="Fotos novas" count={photos.reduce((n, g) => n + g.cases.length, 0)}>
        <p className="-mt-1 text-sm text-pretty text-muted-foreground">
          Enquanto o borrão automático não existe, remova fotos com rosto ou placa legível e fotos com crianças, pedindo
          outra enquadrada só no problema. Isso não conta contra quem enviou.
        </p>
        {photos.map((g) => (
          <FirstLook key={g.itemId} cases={g.cases} muni={muni} />
        ))}
      </Section>
      {awaiting && awaiting.count > 0 && <AwaitingCheck {...awaiting} />}
      <Section id="denuncias" title="Conversas denunciadas" count={posts.length}>
        {posts.map((p) => (
          <ReportedPostCard key={p.id} post={p} />
        ))}
      </Section>
    </div>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    // A flex column, not a grid: a leaving card closes the gap with a negative margin (globals.css, .queue-row).
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-lg font-semibold tracking-tight">
        {title}
        <span className="font-mono text-sm font-normal text-muted-foreground tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/**
 * A photo reported for nudity or a child is blurred until the moderator chooses to look: volunteers
 * shouldn't meet the worst of it by surprise.
 */
function CasePhoto({ photo, shield: reported, className }: { photo: QueuePhoto; shield: boolean; className?: string }) {
  // Reported for nudity or a child, or rated likely nude by the screening service (round 20).
  const shield = reported || (photo.screen?.nudity ?? 0) >= LIKELY_NUDE;
  const [seen, setSeen] = useState(!shield);
  return (
    <span className={cn("relative block overflow-hidden rounded-lg border border-hairline bg-panel-3", className)}>
      <img
        src={photo.src}
        alt=""
        className={cn("size-full object-cover transition duration-200 ease-fluid", !seen && "blur-2xl")}
      />
      {shield && (
        <button
          type="button"
          onClick={() => setSeen((v) => !v)}
          className={cn(
            "absolute inset-0 grid place-items-center content-center gap-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
            seen ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "bg-foreground/40 text-background",
          )}
        >
          {seen ? (
            <span className="rounded-md bg-foreground/70 px-2 py-1 text-background">
              <EyeOff className="mr-1 inline size-3.5" aria-hidden="true" />
              Cobrir
            </span>
          ) : (
            <>
              <Eye className="size-4" aria-hidden="true" />
              Ver imagem
            </>
          )}
        </button>
      )}
    </span>
  );
}

/**
 * What the screening service saw in a photo (round 20): where to look, never a verdict. Faces and
 * plates matter until automatic blurring exists: a readable one means asking for another photo.
 */
function ScreenTags({ screen }: { screen: QueuePhoto["screen"] }) {
  if (!screen) return null;
  const tags = [
    screen.nudity >= LIKELY_NUDE ? "Nudez provável" : null,
    screen.faces ? `${screen.faces} ${screen.faces === 1 ? "rosto" : "rostos"}` : null,
    screen.plates ? `${screen.plates} ${screen.plates === 1 ? "placa" : "placas"}` : null,
  ].flatMap((t) => (t ? [t] : []));
  if (!tags.length) return <p className="text-2xs text-muted-foreground">Triagem: nada a apontar</p>;
  return (
    <p className="flex flex-wrap gap-1" aria-label="O que a triagem automática viu">
      {tags.map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
    </p>
  );
}

function Reports({ reports }: { reports: ReportSummary }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {reports.reasons.map((r) => (
          <Badge key={r.reason} variant="secondary">
            {REPORT_REASON[r.reason].label}
            {r.n > 1 && <span className="font-mono tabular-nums"> ×{r.n}</span>}
          </Badge>
        ))}
      </div>
      {reports.notes.map((n) => (
        <p key={n} className="border-l border-hairline-strong pl-3 text-sm text-pretty text-ink-2">
          “{n}”
        </p>
      ))}
    </div>
  );
}

const REASON_LABEL: Record<QueueCase["reason"], string> = {
  guest_pin: "Registro sem conta",
  prescreen: "Verificação automática",
  photo: "Foto nova",
  report: "Denúncia",
  takedown: "Removido pela moderação",
  muted: "Conta silenciada",
};

/** The pin a case belongs to, for context: category, place, title, code, byline, and a link. */
function PinContext({ c, muni, full }: { c: QueueCase; muni: Municipality; full: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <CategoryLine muni={muni} category={c.item.category} where={whereOf(c.item, muni)} />
      <h3 id={`caso-${c.id}`} className={cn("leading-snug font-semibold", full ? "text-base" : "text-sm")}>
        {c.item.title}
      </h3>
      {full && c.item.text && <p className="text-sm leading-relaxed text-pretty text-ink-2">{c.item.text}</p>}
      <p className="text-xs text-muted-foreground">
        Código <span className="font-mono">{c.item.id}</span> ·{" "}
        {c.item.visibility === "anonymous" ? "Anônimo em público" : `por ${c.item.author ?? "—"}`}
        {!c.item.moderation && (
          <>
            {" · "}
            <a href={`/o/${c.item.id}`} className={textLink}>
              Abrir o registro
            </a>
          </>
        )}
      </p>
    </div>
  );
}

type Step = null | "reject" | "republish" | "uphold" | "overturn";

/** One case: what it's about, why it's here, and the decision. */
function CaseCard({ c, muni }: { c: QueueCase; muni: Municipality }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(null);
  const [note, setNote] = useState("");
  const [removal, setRemoval] = useState<Removal>(emptyRemoval);
  const { leaving, leave } = useLeave();
  // Decided: the card leaves its place first, then the queue refetches without it.
  const done = () => leave(() => void queryClient.invalidateQueries({ queryKey: moderationQueueQuery.queryKey }));
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
  const held = c.reason === "guest_pin" || c.reason === "prescreen";
  const shield = shieldsModerator(c.reports?.reasons.map((r) => r.reason) ?? []);
  const removeLabel = c.target === "item" ? (held ? "Recusar" : "Retirar do mapa") : "Remover";

  const submitNote = () => {
    const text = (step === "reject" ? removal.note : note).trim();
    if (text.length < 3) return void toast("Escreva o motivo: ele aparece para quem publicou.");
    if (step === "reject") decide.mutate({ caseId: c.id, decision: "reject", note: text, weight: removal.weight });
    if (step === "republish") decide.mutate({ caseId: c.id, decision: "republish", note: text });
    if (step === "uphold" || step === "overturn") contest.mutate(step === "overturn");
  };

  return (
    <QueueRow leaving={leaving}>
      <article className={panel} aria-labelledby={`caso-${c.id}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{REASON_LABEL[c.reason]}</Badge>
          {c.target === "item" &&
            c.flags.map((f) => (
              <Badge key={f} variant="secondary">
                {FLAG_LABEL[f]}
              </Badge>
            ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {c.target === "photo" ? "Quem enviou" : c.target === "update" ? "Quem escreveu" : "Autor"}{" "}
            <span className="font-mono">{c.handle}</span>
            {c.priorRefusals > 0 && ` · ${c.priorRefusals} ${c.priorRefusals === 1 ? "recusa" : "recusas"} antes`}
          </span>
        </div>

        {c.target === "photo" && (
          <div className="grid gap-3.5 compact:grid-cols-2">
            <span className="grid content-start gap-1.5">
              <CasePhoto photo={c.photo} shield={shield} className="aspect-4/3" />
              <ScreenTags screen={c.photo.screen} />
            </span>
            <PinContext c={c} muni={muni} full={false} />
          </div>
        )}
        {c.target === "update" && (
          <div className="grid gap-3">
            <blockquote className="grid gap-1 rounded-xl border border-hairline bg-muted p-3.5">
              <p className="text-xs text-muted-foreground">
                <b className="font-semibold text-foreground">{c.update.actor}</b>, na história do registro
              </p>
              <p className="text-sm leading-relaxed text-pretty break-words">{c.update.text}</p>
            </blockquote>
            <PinContext c={c} muni={muni} full={false} />
          </div>
        )}
        {c.target === "item" && (
          <div className="grid gap-3.5">
            {c.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {c.photos.map((p) => (
                  <CasePhoto key={p.id} photo={p} shield={shield} className="size-24 shrink-0" />
                ))}
              </div>
            )}
            <PinContext c={c} muni={muni} full />
          </div>
        )}

        {c.reports && <Reports reports={c.reports} />}

        {c.contest && (
          <section className="grid gap-1 rounded-xl border border-dashed border-hairline-strong p-3">
            <h4 className="text-sm font-semibold">Contestação</h4>
            {c.decided?.note && <p className="text-xs text-muted-foreground">Decisão: {c.decided.note}</p>}
            <p className="text-sm text-pretty text-ink-2">“{c.contest.text}”</p>
          </section>
        )}

        {step === "reject" ? (
          <RemovalNote id={`nota-${c.id}`} value={removal} onChange={setRemoval} />
        ) : step ? (
          <div className="grid gap-2">
            <label htmlFor={`nota-${c.id}`} className="text-sm font-medium">
              {step === "republish"
                ? "O que pedir a quem publicou"
                : step === "overturn"
                  ? "Por que voltar atrás"
                  : "Motivo"}
            </label>
            <Textarea
              id={`nota-${c.id}`}
              value={note}
              maxLength={280}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                step === "republish"
                  ? "Ex.: propaganda eleitoral não sai como Anônimo; publique assinado com seu apelido."
                  : "Ex.: a pessoa ao fundo não dá para reconhecer."
              }
            />
            <p className="text-xs text-muted-foreground">Aparece para quem publicou e no histórico do registro.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {step ? (
            <>
              <Button
                size="sm"
                variant={step === "reject" ? "destructive" : "default"}
                disabled={busy}
                onClick={submitNote}
              >
                {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
                {step === "reject"
                  ? removeLabel
                  : step === "republish"
                    ? "Pedir republicação"
                    : step === "overturn"
                      ? "Aceitar e devolver"
                      : "Manter a decisão"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStep(null)}>
                Cancelar
              </Button>
            </>
          ) : c.contest && c.decidedByYou ? (
            <p className="text-xs text-muted-foreground">
              Você decidiu este caso: a contestação fica para outra pessoa da moderação.
            </p>
          ) : c.contest ? (
            <>
              <Button size="sm" onClick={() => setStep("overturn")}>
                Aceitar e devolver
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStep("uphold")}>
                Manter a decisão
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" disabled={busy} onClick={() => decide.mutate({ caseId: c.id, decision: "publish" })}>
                {decide.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
                {held ? "Publicar" : "Manter no ar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStep("reject")}>
                {removeLabel}
              </Button>
              {c.target === "item" && c.flags.includes("electoral") && c.item.visibility === "anonymous" && (
                <Button size="sm" variant="outline" onClick={() => setStep("republish")}>
                  Pedir assinatura
                </Button>
              )}
            </>
          )}
        </div>
        {!c.contest && <EscalateAction caseId={c.id} onDone={done} />}
        {!c.decidedByYou && <SanctionActions caseId={c.id} />}
      </article>
    </QueueRow>
  );
}

/**
 * New photos on one pin, before anyone else sees them: each one approved unless marked to remove,
 * all decided at once. Removing needs a reason, which goes to the pin's history.
 */
function FirstLook({ cases, muni }: { cases: PhotoCase[]; muni: Municipality }) {
  const queryClient = useQueryClient();
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [removal, setRemoval] = useState<Removal>(emptyRemoval);
  const { leaving, leave } = useLeave();
  const refetch = () => void queryClient.invalidateQueries({ queryKey: moderationQueueQuery.queryKey });
  const first = cases[0];
  const decide = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        cases.map((c) =>
          decideCase({
            data: removed.has(c.id)
              ? { caseId: c.id, decision: "reject", note: removal.note.trim(), weight: removal.weight }
              : { caseId: c.id, decision: "publish" },
          }),
        ),
      );
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) throw new Error(failed.error);
    },
    onSuccess: () => {
      toast(removed.size ? "Decisão registrada." : cases.length === 1 ? "Foto aprovada." : "Fotos aprovadas.");
      leave(refetch);
    },
    onError: (e) => {
      toast(e.message);
      refetch();
    },
  });
  if (!first) return null;
  const toggle = (id: string) =>
    setRemoved((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const removing = removed.size > 0;
  return (
    <QueueRow leaving={leaving}>
      <article className={panel} aria-labelledby={`caso-${first.id}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {cases.length === 1 ? "Foto nova" : <span className="tabular-nums">{cases.length} fotos novas</span>}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            Quem enviou <span className="font-mono">{first.handle}</span>
            {first.priorRefusals > 0 &&
              ` · ${first.priorRefusals} ${first.priorRefusals === 1 ? "recusa" : "recusas"} antes`}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 compact:grid-cols-3">
          {cases.map((c) => {
            const out = removed.has(c.id);
            return (
              <li key={c.id} className="grid gap-1.5">
                <span className={cn("relative block transition-opacity duration-200 ease-fluid", out && "opacity-45")}>
                  <CasePhoto photo={c.photo} shield={false} className="aspect-4/3" />
                  {out && (
                    <span className="absolute inset-0 grid place-items-center">
                      <X className="size-8 text-background drop-shadow" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <ScreenTags screen={c.photo.screen} />
                <Button
                  size="sm"
                  variant={out ? "destructive" : "outline"}
                  aria-pressed={out}
                  onClick={() => toggle(c.id)}
                >
                  {out ? "Vai sair" : "Remover"}
                </Button>
                <EscalateAction caseId={c.id} compact />
              </li>
            );
          })}
        </ul>
        <PinContext c={first} muni={muni} full={false} />
        {removing && <RemovalNote id={`nota-${first.id}`} value={removal} onChange={setRemoval} />}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={decide.isPending || (removing && removal.note.trim().length < 3)}
            onClick={() => decide.mutate()}
          >
            {decide.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : (
              <Check data-icon="inline-start" aria-hidden="true" />
            )}
            {!removing
              ? cases.length === 1
                ? "Aprovar"
                : "Aprovar todas"
              : removed.size === cases.length
                ? "Remover"
                : "Remover marcadas e aprovar o resto"}
          </Button>
        </div>
        <SanctionActions caseId={first.id} />
      </article>
    </QueueRow>
  );
}

/** A reply someone reported in a bairro board or a pin's conversation: hide it, or keep it up. */
function ReportedPostCard({ post }: { post: ReportedPost }) {
  const queryClient = useQueryClient();
  const { leaving, leave } = useLeave();
  const decide = useMutation({
    mutationFn: (hide: boolean) => decidePost({ data: { postId: post.id, hide } }),
    onSuccess: (r, hide) => {
      toast(r.ok ? (hide ? "Mensagem ocultada." : "Mensagem mantida.") : r.error);
      if (r.ok) leave(() => void queryClient.invalidateQueries({ queryKey: reportedPostsQuery.queryKey }));
    },
  });
  return (
    <QueueRow leaving={leaving}>
      <article className={panel} aria-label={`Mensagem de ${post.by}`}>
        <div className="grid gap-1">
          <p className="text-xs text-muted-foreground">
            Em “{post.threadTitle}” · {post.reports} {post.reports === 1 ? "denúncia" : "denúncias"}
          </p>
          <p className="text-sm leading-relaxed break-words">
            <b className="font-semibold">{post.by}</b>: {post.text}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate(true)}>
            Ocultar
          </Button>
          <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
            Manter
          </Button>
        </div>
      </article>
    </QueueRow>
  );
}
