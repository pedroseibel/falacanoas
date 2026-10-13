import {
  awaitingDigest,
  communityLine,
  dateAgo,
  deriveEvents,
  isOpen,
  legalDeadline,
  localStamp,
  relativeTime,
  UPDATE_MAX,
  type CommunityStatus,
  type Item,
  type ItemEventKind,
  type Municipality,
  type OfficialStatus,
  type Viewer,
} from "@fala/core";
import {
  BadgeCheck,
  Camera,
  Check,
  Info,
  Loader2,
  MessageSquare,
  Pencil,
  Repeat2,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { CategoryLine } from "@/components/category";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { textLink } from "@/features/landing/bits";
import { Input } from "@/components/ui/input";
import { DaysMeter } from "@/components/viz";
import { cn } from "@/lib/utils";
import { whereOf } from "@/features/map/item-card";
import { ItemActions, usePhotoInput } from "./item-actions";
import { ModerationNotice } from "./moderation-notice";
import { PinConversation } from "./pin-conversation";
import { useItemActions } from "./use-item-actions";

const EVENT_ICON: Record<ItemEventKind, LucideIcon> = {
  created: Pencil,
  sent_to_authority: Send,
  confirmed: Check,
  update_added: MessageSquare,
  photo_added: Camera,
  official_response: BadgeCheck,
  official_status_changed: BadgeCheck,
  community_resolved: Check,
  reopened: Repeat2,
  merged: Repeat2,
  moderation: Info,
};

const OFFICIAL_LABEL: Record<OfficialStatus, string> = {
  acknowledged: "Ciente",
  under_review: "Em análise",
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  resolved: "Marcou como resolvido",
};

const COMMUNITY_LABEL: Record<CommunityStatus, string> = {
  reported: "Aguardando confirmação",
  confirmed: "Confirmado",
  ongoing: "Continua acontecendo",
  apparently_resolved: "Parece resolvido",
  resolved: "Resolvido",
};

const day = (d: Date, timezone: string) => localStamp(d, timezone).split(" · ")[0];

/**
 * The Ouvidoria's legal deadline (Lei 13.460, art. 16), counted from the protocol. It sits apart from
 * the public clock, which keeps counting from the send date (DECISIONS rounds 5 and 18).
 */
function LegalDeadline({
  protocol,
  now,
  timezone,
  demo,
}: {
  protocol: { number: string; at: string };
  now: Date;
  timezone: string;
  demo: boolean;
}) {
  const at = new Date(protocol.at);
  const { due, daysLeft, overdue } = legalDeadline(at, now);
  const status = overdue
    ? `vencido há ${-daysLeft} ${-daysLeft === 1 ? "dia" : "dias"}`
    : daysLeft === 0
      ? "vence hoje"
      : `faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`;
  return (
    <div className="grid gap-1 border-t border-hairline pt-2.5 text-xs">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          Prazo legal da Ouvidoria {demo && <Badge variant="outline">exemplo</Badge>}
        </span>
        <span className={cn("font-medium tabular-nums", overdue ? "text-signal-text" : "text-foreground")}>
          {status}
        </span>
      </p>
      <p className="text-muted-foreground">
        Protocolo <span className="text-ink-2 tabular-nums">{protocol.number}</span>, recebido em {day(at, timezone)}.
        Até {day(due, timezone)}, prorrogável uma vez por mais 30 dias (Lei 13.460, art. 16).
      </p>
    </div>
  );
}

export function ItemDetail({
  it,
  muni,
  viewer,
  now,
  member,
  onSignIn,
  trackingKey,
}: {
  it: Item;
  muni: Municipality;
  viewer: Viewer;
  now: Date;
  /** Signed in at nível 1, with an apelido: can act on the item. */
  member: boolean;
  /** Where actions send someone who can't act yet. */
  onSignIn: () => void;
  /** A guest pin's tracking key, from its link: lets its author contest a refusal. */
  trackingKey: string | null;
}) {
  const a = useItemActions(it, member, onSignIn);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const currentPhoto = usePhotoInput((photos) => a.run({ type: "photo", photos }));
  const write = () => (member ? document.getElementById("composer")?.focus() : onSignIn());
  const open = isOpen(it);
  const issue = it.kind === "public_issue";
  const photo = it.photos[photoIndex] ?? it.photos[0];
  const over = open && it.days > muni.deadlineDays;
  const disagreement = it.official?.status === "resolved" && it.community === "ongoing";
  const events = deriveEvents(it, (d) => dateAgo(now, d));
  const unit = issue ? "dias em acompanhamento" : open ? "dias em aberto" : "dias até o conserto";

  return (
    <article className="grid">
      {currentPhoto.element}
      {photo ? (
        <figure className="m-0">
          <div className="relative bg-panel-3">
            <img src={photo.src} alt={`Foto do registro: ${it.title}`} className="aspect-4/3 w-full object-cover" />
            <span className="absolute top-3 left-3 rounded-md bg-foreground/70 px-2 py-1.5 font-mono text-xs text-background">
              {photo.takenAt} · {photo.by}
            </span>
            {photo.credit && (
              <span className="absolute right-2.5 bottom-2.5 rounded-md bg-foreground/60 px-1.5 py-0.5 text-2xs text-background">
                {photo.credit}
              </span>
            )}
          </div>
          <div
            className="flex gap-2 overflow-x-auto border-b border-hairline bg-card px-4 py-2.5"
            role="group"
            aria-label="Fotos ao longo do tempo"
          >
            {it.photos.map((p, k) => (
              <button
                key={`${p.src}|${p.takenAt}`}
                type="button"
                aria-pressed={p === photo}
                onClick={() => setPhotoIndex(k)}
                className="grid shrink-0 gap-1 text-left"
              >
                <img
                  src={p.src}
                  alt=""
                  className={cn(
                    "h-14 w-19 rounded-md border-2 object-cover",
                    p === photo ? "border-foreground" : "border-transparent",
                  )}
                />
                <small className="font-mono text-2xs text-muted-foreground">{p.takenAt.split(" · ")[0]}</small>
              </button>
            ))}
            <button
              type="button"
              className="grid shrink-0 gap-1 text-left"
              disabled={a.pending === "photo"}
              onClick={() => (member ? currentPhoto.open() : onSignIn())}
            >
              <span className="grid h-14 w-19 place-items-center rounded-md border border-dashed border-hairline-strong bg-muted text-muted-foreground">
                <Camera className="size-4" />
              </span>
              <small className="font-mono text-2xs text-muted-foreground">foto atual</small>
            </button>
          </div>
        </figure>
      ) : (
        <div className="grid aspect-video place-items-center content-center gap-2.5 bg-panel-3 text-center text-sm text-muted-foreground">
          <Icon name={categoryIcon(it.category)} size={36} />
          Sem foto ainda.
          <Button
            variant="outline"
            size="sm"
            disabled={a.pending === "photo"}
            onClick={() => (member ? currentPhoto.open() : onSignIn())}
          >
            <Camera data-icon="inline-start" />
            Adicionar foto
          </Button>
        </div>
      )}

      <div className="grid gap-4.5 px-4.5 pt-4 pb-7">
        <header>
          <CategoryLine muni={muni} category={it.category} where={whereOf(it, muni)} demo={it.demo} />
          <h2 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance">{it.title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            por{" "}
            <b className="font-medium text-ink-2">
              {it.visibility === "anonymous" ? "Anônimo" : (it.author ?? viewer.nick)}
            </b>{" "}
            · {it.createdAt ? day(new Date(it.createdAt), muni.timezone) : dateAgo(now, it.days)}
          </p>
        </header>

        <section className="grid gap-2.5 rounded-xl border border-hairline bg-muted p-3.5" aria-label="Relógio público">
          <p className="flex items-baseline gap-2.5">
            <span className={cn("text-5xl leading-none font-semibold tracking-tighter", over && "text-signal-text")}>
              {it.days}
            </span>
            <span className="text-sm leading-tight text-muted-foreground">{unit}</span>
          </p>
          <DaysMeter days={it.days} deadline={muni.deadlineDays} size="lg" />
          <p className="text-xs text-muted-foreground">
            {awaitingDigest(it)
              ? `Ainda não foi enviado. Entra no próximo resumo diário, às ${muni.digestHour}h, e o relógio começa no envio.`
              : open
                ? `Enviado à Prefeitura em ${it.sentAt ? localStamp(new Date(it.sentAt), muni.timezone).replace(" · ", ", às ") : `${dateAgo(now, it.days)}, às ${muni.digestHour}:00`}. O relógio conta desde então.`
                : `Fechado pelos vizinhos em ${it.closedAt ? day(new Date(it.closedAt), muni.timezone) : dateAgo(now, 0)}.`}
          </p>
          {open && it.protocol && (
            <LegalDeadline protocol={it.protocol} now={now} timezone={muni.timezone} demo={Boolean(it.demo)} />
          )}
        </section>

        <section className="grid grid-cols-2 gap-2" aria-label="Situação">
          <div className="grid content-start gap-1 rounded-xl border border-hairline bg-card p-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" /> Comunidade
            </span>
            <span className="text-sm leading-snug font-semibold">
              {issue ? "Isso me afeta" : COMMUNITY_LABEL[it.community]}
            </span>
            <span className="text-xs text-muted-foreground">
              {communityLine(it)} · {relativeTime(it.updatedMinutesAgo)}
            </span>
          </div>
          <div className="grid content-start gap-1 rounded-xl border border-hairline bg-card p-3">
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <BadgeCheck className="size-3.5" /> Prefeitura
              {it.official && <Badge variant="outline">{it.demo ? "verificada · exemplo" : "verificada"}</Badge>}
            </span>
            <span
              className={cn("text-sm leading-snug font-semibold", !it.official && "font-medium text-muted-foreground")}
            >
              {it.official ? OFFICIAL_LABEL[it.official.status] : "Sem resposta registrada"}
            </span>
            <span className="text-xs text-muted-foreground">
              {it.official ? `${it.official.agency} · há ${it.official.daysAgo} dias` : "Recebe o resumo diário."}
            </span>
          </div>
          {disagreement && (
            <p className="col-span-2 flex items-start gap-2 text-xs text-ink-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />A Prefeitura diz que resolveu;{" "}
              {it.disagreeing ?? it.confirmations} moradores dizem que continua. O Fala registra as duas coisas e não
              decide quem está certo.
            </p>
          )}
        </section>

        {it.moderation ? (
          <ModerationNotice it={it} trackingKey={trackingKey} />
        ) : (
          <ItemActions it={it} muni={muni} actions={a} now={now} onWrite={write} />
        )}

        <p className="text-sm leading-relaxed text-ink-2">{it.text}</p>

        <section aria-labelledby="hist">
          <h3 id="hist" className="flex items-baseline justify-between text-sm font-semibold">
            Histórico{" "}
            <small className="text-xs font-normal text-muted-foreground">
              {it.updates} {it.updates === 1 ? "atualização" : "atualizações"} · {relativeTime(it.updatedMinutesAgo)}
            </small>
          </h3>
          <ol className="mt-2.5 grid">
            {events.map((e, k) => {
              const EventIcon = EVENT_ICON[e.kind];
              const official = e.kind === "official_response" || e.kind === "official_status_changed";
              return (
                <li key={`${e.at}|${e.actor}|${e.text}`} className="relative flex gap-2.5 pb-3.5 last:pb-0">
                  {k < events.length - 1 && (
                    <span className="absolute top-5 bottom-0 left-2.5 w-px bg-border" aria-hidden="true" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid size-5.5 shrink-0 place-items-center rounded-full border",
                      official ? "border-foreground bg-foreground text-background" : "border-border bg-card text-ink-2",
                    )}
                  >
                    <EventIcon className="size-3" />
                  </span>
                  <div>
                    <p className="font-mono text-2xs text-muted-foreground">{e.at}</p>
                    <p className="text-sm font-semibold">
                      {e.actor}{" "}
                      {official && <Badge variant="outline">{it.demo ? "verificada · exemplo" : "verificada"}</Badge>}
                    </p>
                    <p className="text-sm leading-snug text-ink-2">{e.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            O histórico não é apagado. Correções e moderação também ficam registradas.
          </p>
        </section>

        {!it.moderation && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!member) return onSignIn();
              if (text) a.run({ type: "update", text }, () => setDraft(""));
            }}
          >
            <label className="sr-only" htmlFor="composer">
              Adicionar atualização
            </label>
            <Input
              id="composer"
              value={draft}
              maxLength={UPDATE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex.: choveu ontem e a água chegou ao banco"
              autoComplete="off"
            />
            <Button type="submit" disabled={a.pending === "update"}>
              {a.pending === "update" && (
                <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
              )}
              Enviar
            </Button>
          </form>
        )}

        {!it.moderation && <PinConversation it={it} member={member} onSignIn={onSignIn} />}

        <p className="border-t border-hairline pt-4 text-xs text-pretty text-muted-foreground">
          Você aparece neste registro, ou ele mostra um dado seu?{" "}
          <a
            href={`/privacidade/pedido?quem=in_content&registro=${it.id}&volta=${encodeURIComponent(`/o/${it.id}`)}`}
            className={textLink}
          >
            Peça para ocultar
          </a>
          .
        </p>
      </div>
    </article>
  );
}
