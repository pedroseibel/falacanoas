import { CONTENT_REPORT_ACTION, REPORT_REASON, ReportReasonSchema, type ReportReason } from "@fala/core";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { SuccessMark } from "@/components/success-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem, RadioGroupSegment, RadioGroupSegmented } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useTurnstile } from "@/lib/turnstile";
import { textLink } from "@/components/text-link";
import { Header, type Head } from "@/components/sheet-head";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { escalateChildAbuse, reportContent, takeDown } from "@/server/content-reports";
import { closeContentReport, contentReportStore, type ReportSubject } from "./content-report-store";
import { ESCALATE_EXPLAINED } from "./escalate";
import { emptyRemoval, RemovalNote, type Removal } from "./removal-note";

const REASONS = ReportReasonSchema.options;
const asReason = (v: unknown) => ReportReasonSchema.safeParse(v).data;

const NOUN: Record<ReportSubject["target"], string> = {
  item: "este registro",
  photo: "esta foto",
  update: "esta atualização",
};

const onOpenChange = (open: boolean) => {
  if (!open) closeContentReport();
};

export interface ContentReportDialogProps {
  /** Signed in at nível 1: reports without a robot check, and a nudity report takes a photo down at once. */
  member: boolean;
  /** Moderates somewhere: can also take the thing down now (the server checks the bairro). */
  moderator: boolean;
  turnstileSiteKey: string | null;
  /** Something changed on the item: the caller refreshes what shows it. */
  onChanged: (itemId: string) => void;
}

/**
 * "Denunciar" (the abuse review of 2026-10-13): why, in one tap, and optionally a few words. A Dialog
 * on desktop, a Drawer on phones, like the report flow. Moderators get a second mode that removes it now.
 */
export function ContentReportDialog(props: ContentReportDialogProps) {
  const subject = useSelector(contentReportStore, (s) => s.subject);
  const session = useSelector(contentReportStore, (s) => s.session);
  const phone = useMediaQuery(PHONE_QUERY);
  const flow = (head: Head) =>
    subject && <ReportFlow key={session} {...props} subject={subject} phone={phone} head={head} />;
  if (phone)
    return (
      <Drawer open={Boolean(subject)} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>{flow({ Title: DrawerTitle, Description: DrawerDescription })}</DrawerContent>
      </Drawer>
    );
  return (
    <Dialog open={Boolean(subject)} onOpenChange={onOpenChange}>
      <DialogContent layout="form" className="sm:max-w-md">
        {flow({ Title: DialogTitle, Description: DialogDescription })}
      </DialogContent>
    </Dialog>
  );
}

function ReportFlow({
  subject,
  member,
  moderator,
  turnstileSiteKey,
  onChanged,
  phone,
  head,
}: ContentReportDialogProps & { subject: ReportSubject; phone: boolean; head: Head }) {
  const [mode, setMode] = useState<"report" | "remove">("report");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [removal, setRemoval] = useState<Removal>(emptyRemoval);
  /** A moderator's removal that is child abuse material: escalated, not just removed (round 20). */
  const [abuse, setAbuse] = useState(false);
  const { mount: mountRobot, token: robotToken } = useTurnstile(turnstileSiteKey ?? "", CONTENT_REPORT_ACTION);
  const target = subject.target === "item" ? { type: subject.target } : { type: subject.target, id: subject.id };

  const send = useMutation({
    mutationFn: async () => {
      const r =
        mode === "remove" && abuse
          ? await escalateChildAbuse({ data: { itemId: subject.itemId, target } })
          : mode === "remove"
            ? await takeDown({
                data: { itemId: subject.itemId, target, note: removal.note.trim(), weight: removal.weight },
              })
            : await reportContent({
                data: {
                  itemId: subject.itemId,
                  target,
                  reason: reason ?? "other",
                  note: note.trim() || null,
                  turnstile: member ? null : await robotToken().catch(() => null),
                },
              });
      if (!r.ok) throw new Error(r.error);
      return { hidden: "hidden" in r && r.hidden };
    },
    onSuccess: () => onChanged(subject.itemId),
  });

  const noun = NOUN[subject.target];
  const footer = cn(
    "shrink-0 gap-2 border-t border-hairline bg-muted px-5 py-3.5",
    phone ? "pb-safe-3.5 grid" : "flex justify-end",
  );
  const size = phone ? "xl" : "lg";

  if (send.isSuccess)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header head={head} title={mode === "remove" ? "Removido" : "Denúncia enviada"}>
          {mode === "remove"
            ? "Saiu do ar agora."
            : send.data.hidden
              ? "A foto saiu do ar agora, até alguém da moderação olhar."
              : "A moderação do bairro vai olhar."}
        </Header>
        <div className="grid place-items-center px-5 py-8">
          <SuccessMark size="lg" />
        </div>
        <div className={footer}>
          <Button size={size} onClick={closeContentReport}>
            Fechar
          </Button>
        </div>
      </div>
    );

  const ready = mode === "remove" ? abuse || removal.note.trim().length >= 3 : Boolean(reason);
  const urgent = subject.target === "photo" && (reason === "sexual" || reason === "child");
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) send.mutate();
      }}
    >
      <Header head={head} title={mode === "remove" ? `Remover ${noun}` : `Denunciar ${noun}`}>
        {mode === "remove"
          ? "Sai do ar na hora. O motivo aparece no histórico do registro e para quem publicou, que pode contestar."
          : "Quem publicou não fica sabendo quem denunciou."}
      </Header>
      <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 py-5">
        {moderator && (
          <RadioGroupSegmented
            aria-label="O que fazer"
            value={mode}
            onValueChange={(v) => setMode(v === "remove" ? "remove" : "report")}
          >
            <RadioGroupSegment value="report">Denunciar</RadioGroupSegment>
            <RadioGroupSegment value="remove">Remover agora</RadioGroupSegment>
          </RadioGroupSegmented>
        )}

        {mode === "remove" ? (
          <>
            <Field orientation="horizontal">
              <Checkbox id="remover-abuso" checked={abuse} onCheckedChange={(on) => setAbuse(on)} />
              <FieldContent>
                <FieldLabel htmlFor="remover-abuso" variant="option">
                  É material de abuso sexual infantil
                </FieldLabel>
              </FieldContent>
            </Field>
            {abuse ? (
              <p className="rounded-xl border border-dashed border-hairline-strong p-3 text-sm text-pretty text-ink-2">
                {ESCALATE_EXPLAINED}
              </p>
            ) : (
              <RemovalNote id="remover-motivo" value={removal} onChange={setRemoval} />
            )}
          </>
        ) : (
          <>
            <RadioGroup aria-label="Motivo" value={reason} onValueChange={(v) => setReason(asReason(v) ?? null)}>
              {REASONS.map((r) => (
                <FieldLabel key={r} htmlFor={`denuncia-${r}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value={r} id={`denuncia-${r}`} />
                    <FieldContent>
                      <FieldTitle>{REPORT_REASON[r].label}</FieldTitle>
                      <FieldDescription>{REPORT_REASON[r].hint}</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            {urgent && (
              <p className="flex gap-2 text-caption text-ink-2">
                <EyeOff className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />A foto sai do ar
                assim que você enviar, até alguém da moderação olhar.
              </p>
            )}
            {reason === "person" && (
              <p className="text-caption text-pretty text-ink-2">
                É você, ou um dado seu? Pelo canal de privacidade você pede para ocultar e recebe um protocolo.{" "}
                <a
                  href={`/privacidade/pedido?quem=in_content&registro=${subject.itemId}&volta=${encodeURIComponent(`/o/${subject.itemId}`)}`}
                  className={textLink}
                >
                  Pedir para ocultar
                </a>
              </p>
            )}
            <div className="grid gap-1.5">
              <label htmlFor="denuncia-nota" className="text-sm font-medium">
                Quer contar mais? <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="denuncia-nota"
                value={note}
                maxLength={280}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: a foto mostra o rosto de uma criança no portão da escola."
              />
            </div>
            {!member && turnstileSiteKey && <div ref={mountRobot} className="hidden has-[iframe]:block" />}
          </>
        )}
        {send.isError && (
          <p role="alert" className="text-caption text-destructive">
            {send.error.message}
          </p>
        )}
      </div>
      <div className={footer}>
        <Button type="button" variant="ghost" size={size} onClick={closeContentReport}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={mode === "remove" ? "destructive" : "default"}
          size={size}
          disabled={!ready || send.isPending || (mode === "report" && !member && !turnstileSiteKey)}
        >
          {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          {mode === "remove" ? (abuse ? "Remover e encaminhar" : "Remover") : "Enviar denúncia"}
        </Button>
      </div>
    </form>
  );
}
