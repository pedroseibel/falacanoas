import {
  CONFIRMATION_MIN_HOURS,
  DAY_MS,
  daysLabel,
  isOpen,
  type Item,
  localDay,
  type Municipality,
  QUIET_CLOSE_DAYS,
  quietCloseDue,
  RESOLVED_VOTES_TO_CLOSE,
  resolvedCloses,
} from "@fala/core";
import {
  Bell,
  Camera,
  Check,
  CircleCheckBig,
  Info,
  Loader2,
  Pencil,
  Repeat2,
  RotateCcw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Thumb } from "@/components/photo-thumb";
import { preparePhoto } from "@/lib/photo";
import type { useItemActions } from "./use-item-actions";

type Actions = ReturnType<typeof useItemActions>;

const day = (iso: string, timezone: string) => localDay(new Date(iso), timezone);

/** A hidden camera-or-gallery input, opened by a button elsewhere. Photos are re-encoded on the device first. */
export function usePhotoInput(onPicked: (files: File[]) => void) {
  const input = useRef<HTMLInputElement>(null);
  const element = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={async (e) => {
        const files = [...(e.currentTarget.files ?? [])];
        e.currentTarget.value = "";
        if (!files.length) return;
        try {
          onPicked(await Promise.all(files.map(preparePhoto)));
        } catch {
          toast("Não deu para abrir a foto. Tente outra.");
        }
      }}
    />
  );
  return { element, open: () => input.current?.click() };
}

const Spin = () => <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />;

/**
 * A once-only action. Done, it stays solid ink like any active toggle: a finished state, not a greyed
 * one. Real `disabled` only covers the moment the request is on its way.
 */
function Action({
  done,
  busy,
  icon: Icon,
  onClick,
  expanded,
  children,
}: {
  done: boolean;
  busy: boolean;
  icon: LucideIcon;
  onClick: () => void;
  /** For an action that opens a panel first. */
  expanded?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      size="action"
      variant={done ? "default" : "outline"}
      aria-pressed={done}
      aria-expanded={expanded}
      aria-disabled={done || undefined}
      disabled={busy}
      onClick={done ? undefined : onClick}
    >
      {busy ? <Spin /> : <Icon data-icon="inline-start" />}
      {children}
    </Button>
  );
}

/**
 * Structured actions instead of likes (DECISIONS round 15), and closing by the community (round 4):
 * the reporter's word or two neighbours close a pin, "Ainda não" reopens it.
 */
export function ItemActions({
  it,
  muni,
  actions: a,
  now,
  onWrite,
}: {
  it: Item;
  muni: Municipality;
  actions: Actions;
  now: Date;
  onWrite: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const v = a.viewer;
  const open = isOpen(it);
  const issue = it.kind === "public_issue";
  const closing = it.community === "apparently_resolved";
  const disputed = it.official?.status === "resolved" && it.community === "ongoing";
  const busy = (type: string) => a.pending === type;

  const follow = (
    <Button
      size="action"
      variant={v?.following ? "default" : "outline"}
      aria-pressed={Boolean(v?.following)}
      onClick={a.toggleFollow}
    >
      <Bell data-icon="inline-start" />
      {v?.following ? "Acompanhando" : "Acompanhar"}
    </Button>
  );

  let grid: ReactNode;
  if (issue)
    grid = (
      <>
        <Action
          done={Boolean(v?.confirmed)}
          busy={busy("confirm")}
          icon={Users}
          onClick={() => a.run({ type: "confirm" })}
        >
          Isso me afeta <span className="font-mono text-xs opacity-70">{it.confirmations}</span>
        </Action>
        <Button size="action" variant="outline" onClick={onWrite}>
          <Info data-icon="inline-start" />
          Tenho informação
        </Button>
        <div className="col-span-2 grid">{follow}</div>
      </>
    );
  else if (!open)
    grid = (
      <>
        <Button size="action" variant="outline" disabled={busy("still")} onClick={() => a.run({ type: "still" })}>
          {busy("still") ? <Spin /> : <RotateCcw data-icon="inline-start" />}
          Voltou a acontecer
        </Button>
        {follow}
      </>
    );
  else
    grid = (
      <>
        {v?.author ? (
          <Button size="action" variant="outline" onClick={onWrite}>
            <Pencil data-icon="inline-start" />
            Atualizar
          </Button>
        ) : (
          <Action
            done={Boolean(v?.confirmed)}
            busy={busy("confirm")}
            icon={Check}
            onClick={() => a.run({ type: "confirm" })}
          >
            {v?.confirmed ? "Confirmado" : "Confirmo"}{" "}
            <span className="font-mono text-xs opacity-70">{it.confirmations}</span>
          </Action>
        )}
        <Action
          done={Boolean(v?.saidStillToday)}
          busy={busy("still")}
          icon={Repeat2}
          onClick={() => a.run({ type: "still" })}
        >
          Continua
        </Action>
        <Action
          done={Boolean(v?.saidResolved)}
          busy={busy("resolved") && !resolving}
          icon={CircleCheckBig}
          expanded={resolving}
          onClick={() => (a.viewer ? setResolving((r) => !r) : a.run({ type: "resolved", photos: [] }))}
        >
          Foi resolvido
        </Action>
        {follow}
      </>
    );

  // Days until it closes on its own; `now` can lag the vote by a minute, so clamp to the rule's range.
  const due = it.resolvingSince ? quietCloseDue(it.resolvingSince).getTime() : 0;
  const left = Math.min(QUIET_CLOSE_DAYS, Math.max(1, Math.ceil((due - now.getTime()) / DAY_MS)));
  const votes = it.resolvedVotes ?? 0;

  return (
    <div className="grid gap-3">
      {open && !issue && (closing || disputed) && !resolving && (
        <section
          aria-labelledby="fechar"
          className="grid gap-2.5 rounded-xl border border-dashed border-hairline-strong p-3.5"
        >
          <p className="text-sm text-ink-2">
            <b id="fechar" className="text-foreground">
              Está resolvido?
            </b>{" "}
            {closing
              ? `${votes === 1 ? "Um vizinho disse" : `${votes} vizinhos disseram`} que sim${it.resolvingSince ? `, em ${day(it.resolvingSince, muni.timezone)}` : ""}. Fecha com mais ${RESOLVED_VOTES_TO_CLOSE - votes === 1 ? "um vizinho" : `${RESOLVED_VOTES_TO_CLOSE - votes} vizinhos`}, ou em ${left} ${daysLabel(left)} sem contestação.`
              : "A Prefeitura diz que resolveu. Quem mora perto confere."}
          </p>
          <div className="flex flex-wrap gap-2">
            {!v?.saidResolved && (
              <Button
                size="sm"
                onClick={() => (a.viewer ? setResolving(true) : a.run({ type: "resolved", photos: [] }))}
              >
                Sim, foi resolvido
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(v?.saidStillToday) || busy("still")}
              onClick={() => a.run({ type: "still" })}
            >
              {busy("still") && <Spin />}
              Ainda não
            </Button>
          </div>
        </section>
      )}

      {resolving && (
        <ResolvePanel
          author={Boolean(v?.author)}
          votes={votes}
          busy={busy("resolved")}
          onCancel={() => setResolving(false)}
          onConfirm={(photos) => a.run({ type: "resolved", photos }, () => setResolving(false))}
        />
      )}

      <section className="grid grid-cols-2 gap-2" aria-label="Ações">
        {grid}
      </section>

      {v?.countsFrom && (
        <p className="text-xs text-muted-foreground">
          Sua palavra passa a contar em {day(v.countsFrom, muni.timezone)}, {CONFIRMATION_MIN_HOURS} horas depois de
          você confirmar o celular. Atualizações e fotos já valem.
        </p>
      )}
    </div>
  );
}

function ResolvePanel({
  author,
  votes,
  busy,
  onCancel,
  onConfirm,
}: {
  author: boolean;
  votes: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (photos: File[]) => void;
}) {
  const [after, setAfter] = useState<File | null>(null);
  const photo = usePhotoInput((files) => setAfter(files[0] ?? null));
  const closes = resolvedCloses(author, votes + 1);
  return (
    <section aria-labelledby="resolver" className="grid gap-3 rounded-xl border border-hairline bg-muted p-3.5">
      <div className="grid gap-1">
        <h3 id="resolver" className="text-sm font-semibold">
          Foi resolvido?
        </h3>
        <p className="text-xs leading-relaxed text-ink-2">
          {author
            ? "Você registrou este problema: com a sua confirmação, ele fecha."
            : closes
              ? "Com a sua confirmação, o registro fecha."
              : `Com a sua e a de mais um vizinho, o registro fecha. Sem contestação, fecha em ${QUIET_CLOSE_DAYS} dias.`}
        </p>
      </div>
      {photo.element}
      <div className="flex flex-wrap items-center gap-2">
        {after ? (
          <Thumb file={after} index={0} onRemove={() => setAfter(null)} />
        ) : (
          <Button size="sm" variant="outline" onClick={photo.open}>
            <Camera data-icon="inline-start" />
            Foto do depois
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => onConfirm(after ? [after] : [])}>
          {busy && <Spin />}
          Confirmar que foi resolvido
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
