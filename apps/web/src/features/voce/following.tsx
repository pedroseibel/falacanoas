import {
  covers,
  followLabel,
  HOME_RADII,
  isOpen,
  distance,
  type FollowPlace,
  type Item,
  type LngLat,
  type Municipality,
} from "@fala/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { House, Loader2, MapPin, Route as RouteIcon, Shapes, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LocationPicker } from "@/features/report/location-picker";
import { followingQuery } from "@/lib/city";
import { followItem } from "@/server/item-actions";
import { followPlace, unfollowPlace, type Following as FollowingData } from "@/server/follows";
import { PushToggle } from "./push-toggle";

const ICON: Record<FollowPlace["kind"], LucideIcon> = { home: House, neighborhood: Shapes, route: RouteIcon };

type Editing = null | "home" | "neighborhood" | "route";

/**
 * "Acompanhando" in Você (DECISIONS round 15): a home and its radius, bairros, a route, single pins.
 * Each row says how many open problems it holds now. No notice is sent yet (BUILD 3.2, 4.2), and the
 * panel says so.
 */
export function Following({
  muni,
  items,
  home,
  onOpen,
}: {
  muni: Municipality;
  items: Item[];
  /** The account's bairro, where the map editors start. */
  home: string | null;
  onOpen: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery(followingQuery);
  const [editing, setEditing] = useState<Editing>(null);
  const keep = (following: FollowingData) => queryClient.setQueryData(followingQuery.queryKey, following);

  const add = useMutation({
    mutationFn: (place: FollowPlace) => followPlace({ data: place }),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      keep(r.following);
      setEditing(null);
      toast("Acompanhando.");
    },
    onError: () => toast("Não deu para salvar agora. Tente de novo."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => unfollowPlace({ data: { id } }),
    onSuccess: (r) => (r.ok ? keep(r.following) : void toast(r.error)),
  });
  const unpin = useMutation({
    mutationFn: (id: string) => followItem({ data: { id, on: false } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: followingQuery.queryKey }),
  });

  const open = items.filter(isOpen);
  const start = (): { center: LngLat; zoom: number } => {
    const bairro = muni.neighborhoods.find((n) => n.slug === home);
    return bairro ? { center: bairro.center, zoom: 14.5 } : { center: muni.center, zoom: 12.5 };
  };
  const places = data?.places ?? [];
  const pins = data?.items ?? [];
  const empty = !places.length && !pins.length;

  return (
    <div className="grid gap-3 px-4 py-4">
      {empty && !editing && (
        <p className="text-sm text-ink-2">
          Sua casa, um trajeto, o bairro ou um registro: acompanhe o que importa para você e veja aqui quanto está em
          aberto em cada lugar.
        </p>
      )}

      {!empty && (
        <ul className="-mx-1.5 grid">
          {places.map(({ id, place }) => {
            const label = followLabel(place, muni);
            const n = open.filter((it) => covers(place, it)).length;
            const Icon = ICON[place.kind];
            return (
              <Row
                key={id}
                icon={Icon}
                title={label.title}
                detail={label.detail}
                count={`${n} ${n === 1 ? "aberto" : "abertos"}`}
                busy={remove.isPending && remove.variables === id}
                onRemove={() => remove.mutate(id)}
                removeLabel={`Deixar de acompanhar: ${label.title}`}
              />
            );
          })}
          {pins.map((it) => (
            <Row
              key={it.id}
              icon={MapPin}
              title={it.title}
              detail={`Registro ${it.id}`}
              count={isOpen(it) ? `${it.days} ${it.days === 1 ? "dia" : "dias"}` : "resolvido"}
              onOpen={() => onOpen(it.id)}
              busy={unpin.isPending && unpin.variables === it.id}
              onRemove={() => unpin.mutate(it.id)}
              removeLabel={`Deixar de acompanhar: ${it.title}`}
            />
          ))}
        </ul>
      )}

      {editing === "home" && (
        <HomeEditor
          muni={muni}
          items={items}
          start={start()}
          busy={add.isPending}
          onCancel={() => setEditing(null)}
          onSave={add.mutate}
        />
      )}
      {editing === "neighborhood" && (
        <BairroEditor
          muni={muni}
          initial={home}
          busy={add.isPending}
          onCancel={() => setEditing(null)}
          onSave={add.mutate}
        />
      )}
      {editing === "route" && (
        <RouteEditor
          muni={muni}
          items={items}
          start={start()}
          busy={add.isPending}
          onCancel={() => setEditing(null)}
          onSave={add.mutate}
        />
      )}

      {!editing && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Acompanhar">
          <Button variant="outline" size="sm" onClick={() => setEditing("home")}>
            <House data-icon="inline-start" />
            {places.some((p) => p.place.kind === "home") ? "Mudar a casa" : "Minha casa"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing("neighborhood")}>
            <Shapes data-icon="inline-start" />
            Um bairro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing("route")}>
            <RouteIcon data-icon="inline-start" />
            Um trajeto
          </Button>
        </div>
      )}

      <PushToggle />
      <p className="text-xs text-muted-foreground">
        Por WhatsApp, os avisos entram depois. Para acompanhar um registro, use “Acompanhar” na página dele.
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  detail,
  count,
  busy,
  onOpen,
  onRemove,
  removeLabel,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  count: string;
  busy: boolean;
  onOpen?: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const body = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="shrink-0 text-xs text-ink-2 tabular-nums">{count}</span>
    </>
  );
  return (
    <li className="flex items-center gap-1 border-b border-hairline last:border-b-0">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1.5 py-2.5">{body}</div>
      )}
      <Button variant="ghost" size="icon" aria-label={removeLabel} disabled={busy} onClick={onRemove}>
        {busy ? <Loader2 className="animate-spin" /> : <X />}
      </Button>
    </li>
  );
}

function EditorFrame({
  title,
  children,
  busy,
  saveLabel,
  onSave,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  busy: boolean;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section aria-label={title} className="grid gap-3 rounded-xl border border-hairline bg-muted p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={onSave}>
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}

function HomeEditor({
  muni,
  items,
  start,
  busy,
  onSave,
  onCancel,
}: {
  muni: Municipality;
  items: Item[];
  start: { center: LngLat; zoom: number };
  busy: boolean;
  onSave: (p: FollowPlace) => void;
  onCancel: () => void;
}) {
  const [at, setAt] = useState<LngLat>(start.center);
  const [radius, setRadius] = useState(500);
  return (
    <EditorFrame
      title="Onde fica a sua casa?"
      busy={busy}
      saveLabel="Acompanhar a casa"
      onSave={() => onSave({ kind: "home", at, radius })}
      onCancel={onCancel}
    >
      <p className="text-xs text-muted-foreground" id="casa-nota">
        Arraste o mapa até perto de casa. O ponto fica só na sua conta e nunca aparece em público.
      </p>
      <LocationPicker
        muni={muni}
        items={items}
        start={start}
        located={false}
        invalid={false}
        describedBy="casa-nota"
        onMove={setAt}
      />
      <ToggleGroup
        variant="outline"
        aria-label="Raio"
        value={[String(radius)]}
        onValueChange={(v) => {
          const n = Number(v[0]);
          if (HOME_RADII.includes(n)) setRadius(n);
        }}
      >
        {HOME_RADII.map((r) => (
          <ToggleGroupItem key={r} value={String(r)}>
            {distance(r)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </EditorFrame>
  );
}

function BairroEditor({
  muni,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  muni: Municipality;
  initial: string | null;
  busy: boolean;
  onSave: (p: FollowPlace) => void;
  onCancel: () => void;
}) {
  const bairros = muni.neighborhoods.toSorted((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [slug, setSlug] = useState(initial ?? bairros[0]?.slug ?? "");
  return (
    <EditorFrame
      title="Qual bairro?"
      busy={busy}
      saveLabel="Acompanhar o bairro"
      onSave={() => onSave({ kind: "neighborhood", neighborhood: slug })}
      onCancel={onCancel}
    >
      <NativeSelect aria-label="Bairro" value={slug} onChange={(e) => setSlug(e.target.value)}>
        {bairros.map((b) => (
          <NativeSelectOption key={b.slug} value={b.slug}>
            {b.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </EditorFrame>
  );
}

function RouteEditor({
  muni,
  items,
  start,
  busy,
  onSave,
  onCancel,
}: {
  muni: Municipality;
  items: Item[];
  start: { center: LngLat; zoom: number };
  busy: boolean;
  onSave: (p: FollowPlace) => void;
  onCancel: () => void;
}) {
  const [from, setFrom] = useState<LngLat | null>(null);
  const [at, setAt] = useState<LngLat>(start.center);
  return (
    <EditorFrame
      title={from ? "Para onde?" : "De onde?"}
      busy={busy}
      saveLabel={from ? "Acompanhar o trajeto" : "Próximo: para onde"}
      onSave={() => {
        if (!from) {
          setFrom(at);
          return;
        }
        onSave({ kind: "route", from, to: at });
      }}
      onCancel={onCancel}
    >
      <p className="text-xs text-muted-foreground" id="trajeto-nota">
        {from
          ? "Agora arraste até o fim do trajeto. Entra o que estiver a até 400 m da linha entre os dois pontos."
          : "Arraste o mapa até o começo do trajeto, como a sua casa."}
      </p>
      {/* A new map for each end: the key remounts it, starting where the first end was set. */}
      <LocationPicker
        key={from ? "para" : "de"}
        muni={muni}
        items={items}
        start={from ? { center: from, zoom: 14 } : start}
        located={Boolean(from)}
        invalid={false}
        describedBy="trajeto-nota"
        onMove={setAt}
      />
    </EditorFrame>
  );
}
