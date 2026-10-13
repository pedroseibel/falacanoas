import {
  GUEST_PIN_ACTION,
  ItemKindSchema,
  REPORT,
  ReachSchema,
  VisibilitySchema,
  communityLine,
  digestDay,
  findDuplicate,
  needsLocation,
  neighborhoodAt,
  plural,
  reportSchema,
  type Duplicate,
  type Item,
  type Municipality,
  type ReportFields,
} from "@fala/core";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Camera, Check, EyeOff, Info, Loader2, MapPin, Users } from "lucide-react";
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { Icon, categoryIcon } from "@/components/Icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupSegment,
  RadioGroupSegmented,
  RadioGroupTile,
  RadioGroupTiles,
} from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { mapControls } from "@/features/map/map-engine";
import { cn } from "@/lib/utils";
import { createReport, joinReport, type JoinResult, type ReportResult } from "@/server/report";
import { LocationPicker } from "./location-picker";
import { Thumb } from "./photo-thumb";
import { useTurnstile } from "@/features/auth/turnstile";
import { preparePhoto } from "./photo";
import {
  listPt,
  missingParts,
  nearLabel,
  pickerStart,
  toJoinFormData,
  toReportFormData,
  type Join,
} from "./report-model";

export interface Author {
  nick: string;
  neighborhood: string | null;
}

/** Title and description parts of the surrounding Dialog (desktop) or Drawer (phone). */
export interface Head {
  Title: ComponentType<{ children: ReactNode }>;
  Description: ComponentType<{ children: ReactNode }>;
}

export type Created = Extract<ReportResult, { ok: true }>;
export type Joined = Extract<JoinResult, { ok: true }> & { withPhoto: boolean };

const asKind = (v: unknown) => ItemKindSchema.safeParse(v).data;
const asReach = (v: unknown) => ReachSchema.safeParse(v).data;
const asVisibility = (v: unknown) => VisibilitySchema.safeParse(v).data;

export function Header({ head, title, children }: { head: Head; title: string; children: ReactNode }) {
  return (
    <div className="grid shrink-0 gap-1 border-b border-hairline px-5 pt-4.5 pr-12 pb-3.5">
      <head.Title>{title}</head.Title>
      <head.Description>{children}</head.Description>
    </div>
  );
}

function Part({ id, title, meta, children }: { id: string; title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={id} className="text-sm font-semibold">
          {title}
        </h3>
        {meta && <span className="text-caption text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function ReportForm({
  muni,
  items,
  author,
  phone,
  head,
  onCreated,
  onJoined,
  guest,
}: {
  muni: Municipality;
  /** Everything on the map, for the duplicate check and the picker's dots. */
  items: Item[];
  author: Author;
  phone: boolean;
  head: Head;
  onCreated: (result: Created) => void;
  onJoined: (result: Joined) => void;
  /**
   * A guest pin (round 2): no account, so a robot check instead, occurrences only, shown as Anônimo
   * and held for moderation. Null for a signed-in neighbour.
   */
  guest: { turnstileSiteKey: string | null } | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [schema] = useState(() => reportSchema(muni));
  const [digest] = useState(() => digestDay(new Date(), muni));
  const [mainView] = useState(() => mapControls.current?.view() ?? null);
  const [pending, setPending] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { mount: mountRobot, token: robotToken } = useTurnstile(guest?.turnstileSiteKey ?? "", GUEST_PIN_ACTION);
  const create = useMutation({
    mutationFn: ({ v, token }: { v: ReportFields; token: string | null }) => {
      const fd = toReportFormData(v);
      if (token) fd.set("turnstile", token);
      return createReport({ data: fd });
    },
  });
  const join = useMutation({ mutationFn: (v: Join) => joinReport({ data: toJoinFormData(v) }) });
  const occurrences = muni.categories.filter((c) => c.kind === "occurrence");
  const bairros = muni.neighborhoods.toSorted((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const defaultValues: ReportFields = {
    kind: "occurrence",
    photos: [],
    category: "",
    title: "",
    reach: "place",
    place: "",
    neighborhood: author.neighborhood ?? "",
    location: null,
    text: "",
    visibility: "pseudonymous",
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      setProblem(null);
      const token = guest ? await robotToken().catch(() => null) : null;
      if (guest && !token)
        return setProblem("Não conseguimos confirmar que é uma pessoa enviando. Recarregue a página e tente de novo.");
      const r = await create.mutateAsync({ v: value, token }).catch(() => null);
      if (!r) return setProblem("Não deu para publicar agora. Confira a conexão e tente de novo.");
      if (!r.ok) return setProblem(r.error);
      onCreated(r);
    },
    onSubmitInvalid: () => {
      // Focus the first part that needs attention, once React has marked it.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
    },
  });

  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const kind = useStore(form.store, (s) => s.values.kind);
  const reach = useStore(form.store, (s) => s.values.reach);
  const category = useStore(form.store, (s) => s.values.category);
  const location = useStore(form.store, (s) => s.values.location);
  const photoCount = useStore(form.store, (s) => s.values.photos.length);
  const missing = useStore(form.store, (s) => listPt(missingParts(s.values)));
  const show = <T,>(errors: T[]) => (submitted ? errors : []);
  const issue = kind === "public_issue";
  const duplicate =
    kind === "occurrence" && category && location
      ? findDuplicate(items, category, location, { ignore: dismissed })
      : null;

  async function addPhotos(files: File[]) {
    const room = REPORT.maxPhotos - form.state.values.photos.length - pending;
    if (files.length > room)
      toast(
        room > 0
          ? `Cabe só mais ${room} ${plural(room, "foto", "fotos")} neste registro.`
          : `Cabem ${REPORT.maxPhotos} fotos por registro.`,
      );
    const picked = files.slice(0, Math.max(0, room));
    setPending((n) => n + picked.length);
    // One at a time: decoding several camera photos at once can exhaust a cheap phone's memory.
    for (const file of picked) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose (memory), see above.
        form.pushFieldValue("photos", await preparePhoto(file));
      } catch {
        toast("Não deu para abrir uma das fotos. Tente outra.");
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  async function joinDuplicate(d: Duplicate) {
    setProblem(null);
    const { photos, visibility } = form.state.values;
    const r = await join.mutateAsync({ itemId: d.item.id, visibility, photos }).catch(() => null);
    if (!r) return setProblem("Não deu para confirmar agora. Confira a conexão e tente de novo.");
    if (!r.ok) return setProblem(r.error);
    onJoined({ ...r, withPhoto: photos.length > 0 });
  }

  const busy = useStore(form.store, (s) => s.isSubmitting) || join.isPending;
  const hint = pending
    ? "Preparando as fotos…"
    : missing
      ? `Falta: ${missing}.`
      : guest
        ? "Vai para a moderação antes de aparecer no mapa."
        : `Entra no resumo de ${digest}, às ${muni.digestHour}h.`;

  return (
    <form
      ref={formRef}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        // Fields mounted after the last change (the questão's title, after switching kinds) have no
        // errors yet, and handleSubmit won't validate a form that already has some: refresh them first.
        void form.validate("change");
        void form.handleSubmit();
      }}
    >
      <Header head={head} title={guest ? "Registrar sem conta" : "Registrar"}>
        {guest
          ? "Foto, tipo e lugar. Sem conta, o registro passa pela moderação antes de aparecer no mapa."
          : issue
            ? "Uma questão que pesa no bairro ou na cidade, em uma frase."
            : "Foto, tipo e lugar bastam. O resto é opcional."}
      </Header>

      <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto overscroll-contain px-5 py-5">
        {guest?.turnstileSiteKey && <div ref={mountRobot} className="empty:hidden" />}
        {!guest && (
          <form.Field name="kind">
            {(field) => (
              <RadioGroupSegmented
                aria-label="Tipo de registro"
                value={field.state.value}
                onValueChange={(v) => {
                  const next = asKind(v);
                  if (next) field.handleChange(next);
                }}
              >
                <RadioGroupSegment value="occurrence">
                  <MapPin />
                  Problema num lugar
                </RadioGroupSegment>
                <RadioGroupSegment value="public_issue">
                  <Users />
                  Questão pública
                </RadioGroupSegment>
              </RadioGroupSegmented>
            )}
          </form.Field>
        )}

        <form.Field name="photos" mode="array">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Part id="r-fotos" title="Fotos" meta={`${issue ? "opcional" : "obrigatória"} · até ${REPORT.maxPhotos}`}>
                <ul className="flex flex-wrap gap-2">
                  {field.state.value.map((file, i) => (
                    <Thumb key={file.name} file={file} index={i} onRemove={() => field.removeValue(i)} />
                  ))}
                  {pending > 0 && (
                    <li className="grid size-20 place-items-center content-center gap-1 rounded-lg border border-hairline bg-panel-3 text-xs text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                      {pending > 1 ? `${pending} fotos` : "Preparando"}
                    </li>
                  )}
                  {field.state.value.length + pending < REPORT.maxPhotos && pending === 0 && (
                    <li>
                      <label
                        className={cn(
                          "grid size-20 cursor-pointer place-items-center content-center gap-1 rounded-lg border border-dashed border-hairline-strong bg-muted px-1 text-center text-xs leading-tight text-ink-2 transition-colors hover:bg-panel-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                          errors.length > 0 && "border-signal-text text-signal-text",
                        )}
                      >
                        <Camera className="size-5" aria-hidden="true" />
                        {field.state.value.length ? "Mais uma" : "Adicionar foto"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          aria-invalid={errors.length > 0}
                          aria-describedby="r-fotos-nota"
                          onChange={(e) => {
                            const files = [...(e.target.files ?? [])];
                            e.target.value = "";
                            void addPhotos(files);
                          }}
                        />
                      </label>
                    </li>
                  )}
                </ul>
                <p id="r-fotos-nota" className="text-caption text-muted-foreground">
                  A foto sai do seu aparelho sem GPS e sem os dados da câmera, e a moderação olha antes de ela aparecer.
                  Rostos e placas ainda não são borrados: enquadre só o problema.
                </p>
                <FieldError errors={errors} />
              </Part>
            );
          }}
        </form.Field>

        {issue ? (
          <>
            <form.Field name="title">
              {(field) => {
                const errors = show(field.state.meta.errors);
                return (
                  <Part id="r-questao" title="Qual é a questão?" meta="uma frase">
                    <Input
                      size="lg"
                      aria-labelledby="r-questao"
                      maxLength={REPORT.maxTitle}
                      placeholder="Ex.: Posto de saúde sem pediatra às terças"
                      value={field.state.value}
                      aria-invalid={errors.length > 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldError errors={errors} />
                  </Part>
                );
              }}
            </form.Field>
            <Part id="r-alcance" title="Onde ela pesa?">
              <form.Field name="reach">
                {(field) => (
                  <RadioGroupSegmented
                    aria-labelledby="r-alcance"
                    value={field.state.value}
                    onValueChange={(v) => {
                      const next = asReach(v);
                      if (next) field.handleChange(next);
                    }}
                  >
                    <RadioGroupSegment value="place">Um lugar</RadioGroupSegment>
                    <RadioGroupSegment value="neighborhood">O bairro</RadioGroupSegment>
                    <RadioGroupSegment value="municipality">A cidade</RadioGroupSegment>
                  </RadioGroupSegmented>
                )}
              </form.Field>
              {reach === "place" && (
                <form.Field name="place">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="r-lugar">
                        Nome do lugar <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FieldLabel>
                      <Input
                        id="r-lugar"
                        size="lg"
                        maxLength={REPORT.maxPlace}
                        placeholder="Ex.: UBS Niterói"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>
              )}
              {reach === "neighborhood" && (
                <form.Field name="neighborhood">
                  {(field) => {
                    const errors = show(field.state.meta.errors);
                    return (
                      <Field data-invalid={errors.length > 0}>
                        <FieldLabel htmlFor="r-bairro">Bairro</FieldLabel>
                        <NativeSelect
                          id="r-bairro"
                          size="lg"
                          value={field.state.value}
                          aria-invalid={errors.length > 0}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        >
                          <NativeSelectOption value="">Escolha o bairro</NativeSelectOption>
                          {bairros.map((b) => (
                            <NativeSelectOption key={b.slug} value={b.slug}>
                              {b.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <FieldError errors={errors} />
                      </Field>
                    );
                  }}
                </form.Field>
              )}
            </Part>
          </>
        ) : (
          <form.Field name="category">
            {(field) => {
              const errors = show(field.state.meta.errors);
              const agency = occurrences.find((c) => c.key === field.state.value)?.agency;
              return (
                <Part id="r-tipo" title="O que é?">
                  <RadioGroupTiles
                    aria-labelledby="r-tipo"
                    value={field.state.value}
                    onValueChange={(v) => {
                      if (typeof v === "string") field.handleChange(v);
                    }}
                  >
                    {occurrences.map((c) => (
                      <RadioGroupTile key={c.key} value={c.key} aria-invalid={errors.length > 0}>
                        <Icon name={categoryIcon(c.key)} size={18} />
                        {c.label}
                      </RadioGroupTile>
                    ))}
                  </RadioGroupTiles>
                  <p className="text-caption text-muted-foreground">
                    {agency ? (
                      <>
                        Responsável: <span className="text-ink-2">{agency}</span>
                      </>
                    ) : (
                      "Cada tipo tem um órgão responsável na Prefeitura."
                    )}
                  </p>
                  <FieldError errors={errors} />
                </Part>
              );
            }}
          </form.Field>
        )}

        {needsLocation({ kind, reach }) && (
          <form.Field name="location">
            {(field) => {
              const errors = show(field.state.meta.errors);
              const slug = field.state.value ? neighborhoodAt(field.state.value, muni.geo.neighborhoods) : null;
              const bairro = muni.neighborhoods.find((n) => n.slug === slug)?.name;
              return (
                <Part id="r-onde" title="Onde?" meta={bairro}>
                  <LocationPicker
                    muni={muni}
                    items={items}
                    start={pickerStart({
                      value: field.state.value,
                      mapView: mainView,
                      home: author.neighborhood,
                      muni,
                    })}
                    located={Boolean(field.state.value)}
                    invalid={errors.length > 0}
                    describedBy="r-onde-nota"
                    onMove={(at) => form.setFieldValue("location", at)}
                  />
                  {errors.length > 0 ? (
                    <FieldError id="r-onde-nota" errors={errors} />
                  ) : (
                    <p id="r-onde-nota" className="text-caption text-muted-foreground">
                      {!field.state.value
                        ? "Arraste o mapa até o ponto exato, ou use a sua localização."
                        : bairro
                          ? "O ponto fica no centro do mapa. Arraste para ajustar."
                          : `Fora de ${muni.name}. Arraste o mapa até o lugar.`}
                    </p>
                  )}
                </Part>
              );
            }}
          </form.Field>
        )}

        {duplicate && (
          <Alert role="status">
            <Info />
            <AlertTitle>Já existe algo parecido a {nearLabel(duplicate.meters)}</AlertTitle>
            <AlertDescription>
              <b className="font-medium text-foreground">{duplicate.item.title}</b> · aberto há {duplicate.item.days}{" "}
              {plural(duplicate.item.days, "dia", "dias")} · {communityLine(duplicate.item)}.
            </AlertDescription>
            <div className="col-start-2 mt-2 flex flex-wrap gap-2">
              {/* Confirming takes an account (round 18, Q17); a guest can still say it's another problem. */}
              {!guest && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || pending > 0}
                  onClick={() => void joinDuplicate(duplicate)}
                >
                  {join.isPending ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <Check data-icon="inline-start" />
                  )}
                  {photoCount ? "Confirmar e adicionar sua foto" : "Confirmar"}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDismissed((ids) => [...ids, duplicate.item.id])}
              >
                É outro problema
              </Button>
            </div>
          </Alert>
        )}

        <form.Field name="text">
          {(field) => {
            const errors = show(field.state.meta.errors);
            return (
              <Part id="r-texto" title="Conte rapidamente" meta="opcional">
                <Textarea
                  aria-labelledby="r-texto"
                  aria-describedby="r-texto-nota"
                  rows={3}
                  maxLength={REPORT.maxText}
                  placeholder={issue ? "Desde quando? Quem é afetado?" : "Ex.: a água chega até o banco da parada"}
                  value={field.state.value}
                  aria-invalid={errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p id="r-texto-nota" className="flex justify-between gap-3 text-caption text-muted-foreground">
                  <span>{issue ? "" : "A primeira frase vira o título."}</span>
                  <span className="font-mono tabular-nums">
                    {field.state.value.length}/{REPORT.maxText}
                  </span>
                </p>
                <FieldError errors={errors} />
              </Part>
            );
          }}
        </form.Field>

        {guest ? (
          <Part id="r-como" title="Publicar como">
            <p className="flex gap-2 text-caption text-ink-2">
              <EyeOff className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              Anônimo. Sem conta, o registro fica em análise até a moderação aprovar, e você recebe um link para
              acompanhar. O Fala guarda o registro de acesso desta conexão, como pede a lei, e nada mais.
            </p>
          </Part>
        ) : (
          <form.Field name="visibility">
            {(field) => (
              <Part id="r-como" title="Publicar como">
                <RadioGroup
                  aria-labelledby="r-como"
                  className="grid-cols-2"
                  value={field.state.value}
                  onValueChange={(v) => {
                    const next = asVisibility(v);
                    if (next) field.handleChange(next);
                  }}
                >
                  <FieldLabel htmlFor="r-como-apelido">
                    <Field orientation="horizontal">
                      <RadioGroupItem value="pseudonymous" id="r-como-apelido" />
                      <FieldContent className="min-w-0">
                        <FieldTitle className="max-w-full">
                          <span className="truncate">{author.nick}</span>
                        </FieldTitle>
                        <FieldDescription>
                          {muni.neighborhoods.find((n) => n.slug === author.neighborhood)?.name ?? "Seu apelido"}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="r-como-anonimo">
                    <Field orientation="horizontal">
                      <RadioGroupItem value="anonymous" id="r-como-anonimo" />
                      <FieldContent>
                        <FieldTitle>Anônimo em público</FieldTitle>
                        <FieldDescription>Sem apelido no registro</FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
                {field.state.value === "anonymous" && (
                  <p className="flex gap-2 text-caption text-ink-2">
                    <EyeOff className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    Seu apelido não aparece neste registro. O Fala ainda liga o registro à sua conta, para evitar abuso
                    e permitir moderação. Nenhum outro dado seu aparece.
                  </p>
                )}
              </Part>
            )}
          </form.Field>
        )}

        {problem && (
          <p role="alert" className="text-sm text-signal-text">
            {problem}
          </p>
        )}

        {/* Round 11: chronic problems, never emergencies. Plain information, no alarm styling. */}
        <p className="border-t border-hairline pt-4 text-caption text-muted-foreground">
          O Fala não é canal de emergência. Em emergência, ligue para a Defesa Civil,{" "}
          <a href="tel:199" className="font-medium text-foreground tabular-nums underline-offset-3 hover:underline">
            199
          </a>
          , ou para os Bombeiros,{" "}
          <a href="tel:193" className="font-medium text-foreground tabular-nums underline-offset-3 hover:underline">
            193
          </a>
          .
        </p>
      </div>

      <div
        className={cn(
          "shrink-0 gap-3 border-t border-hairline bg-muted px-5 py-3.5",
          phone ? "pb-safe grid" : "flex items-center justify-between",
        )}
      >
        <p className="text-caption text-muted-foreground" aria-live="polite">
          {hint}
        </p>
        <Button type="submit" variant="signal" size={phone ? "xl" : "lg"} disabled={busy || pending > 0}>
          {form.state.isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Publicar
        </Button>
      </div>
    </form>
  );
}
