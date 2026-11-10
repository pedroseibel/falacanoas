import { itemPath, whereOf } from "@fala/core";
import type { Item, Municipality } from "@fala/core";
import { useSelector } from "@tanstack/react-store";
import { Copy, Map as MapIcon, Share2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SuccessMark } from "@/components/success-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useShowItem } from "@/lib/city";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { ReportForm, type Author, type Created } from "./report-form";
import { Header, type Head } from "@/components/sheet-head";
import { joinMessage } from "./report-model";
import { closeReport, reportStore } from "./report-store";

export interface ReportDialogProps {
  muni: Municipality;
  items: Item[];
  /**
   * The signed-in, phone-verified person with an apelido; "guest" for a visitor's guest pin (round 2);
   * null hides the dialog.
   */
  author: Author | "guest" | null;
  /** Turnstile site key, for the guest pin's robot check. */
  turnstileSiteKey: string | null;
  /** Opens an item on the map (the route adapter owns navigation); `key` opens a guest pin in moderation. */
  onView: (id: string, key?: string) => void;
}

const onOpenChange = (open: boolean) => {
  if (!open) closeReport();
};

/** "Registrar": a Dialog on desktop, a Drawer on phones (research/DECISIONS.md, rounds 3, 4, 6 and 15). */
export function ReportDialog({ author, ...props }: ReportDialogProps) {
  const open = useSelector(reportStore, (s) => s.open);
  const session = useSelector(reportStore, (s) => s.session);
  const phone = useMediaQuery(PHONE_QUERY);
  if (!author) return null;
  const flow = (head: Head) => <ReportFlow key={session} {...props} author={author} phone={phone} head={head} />;
  if (phone)
    return (
      // Like the dialog: a stray tap on the scrim must not throw away photos already picked. Swiping
      // down (a deliberate gesture), Esc and Fechar still close it.
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle disablePointerDismissal>
        <DrawerContent>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" className="absolute top-5 right-3 z-20" />}>
            <X />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
          {flow({ Title: DrawerTitle, Description: DrawerDescription })}
        </DrawerContent>
      </Drawer>
    );
  return (
    // A stray click outside must not throw away photos already picked; Esc and the close button still work.
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent layout="form" className="sm:max-w-xl">
        {flow({ Title: DialogTitle, Description: DialogDescription })}
      </DialogContent>
    </Dialog>
  );
}

function ReportFlow({
  muni,
  items,
  author,
  phone,
  head,
  onView,
  turnstileSiteKey,
}: Omit<ReportDialogProps, "author"> & { author: Author | "guest"; phone: boolean; head: Head }) {
  const [done, setDone] = useState<Created | "queued" | null>(null);

  const guest = author === "guest";
  const showItem = useShowItem();
  /** The server's copy of the item, on the rail, the map and its page at once. */
  const remember = (item: Item) => {
    // A guest pin waits for moderation: it isn't on the map yet.
    if (!item.moderation) showItem(item);
  };

  if (done === "queued") return <QueuedDone head={head} />;
  if (done) return <ReportDone muni={muni} done={done} phone={phone} head={head} onView={onView} />;
  return (
    <ReportForm
      muni={muni}
      items={items}
      author={guest ? { nick: "Anônimo", neighborhood: null } : author}
      guest={guest ? { turnstileSiteKey } : null}
      phone={phone}
      head={head}
      onCreated={(r) => {
        remember(r.item);
        setDone(r);
      }}
      onQueued={() => setDone("queued")}
      onJoined={(r) => {
        remember(r.item);
        closeReport();
        onView(r.item.id);
        toast(joinMessage(r.confirmation, r.withPhoto));
      }}
    />
  );
}

/** The connection dropped: the report waits on the phone, and goes on its own (outbox.ts). */
function QueuedDone({ head }: { head: Head }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header head={head} title="Guardado neste celular" focus>
        A conexão falhou. O registro e as fotos ficaram guardados aqui e vão ser enviados sozinhos quando a internet
        voltar, com o Fala aberto. Não precisa registrar de novo.
      </Header>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
        <Button variant="outline" className="justify-self-start" onClick={closeReport}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

/**
 * The pin's new code, its characters rising one after another just after the check lands: the
 * moment a problem goes on the map. One copy of the text, so selecting and copying it gives the code
 * once.
 */
function RisingCode({ code }: { code: string }) {
  return (
    <span className="font-mono text-3xl leading-none font-medium tracking-tight">
      {[...code].map((c, i) => (
        <span
          // oxlint-disable-next-line no-array-index-key -- a code's characters repeat; their place is their identity
          key={i}
          className="inline-block transition duration-260 ease-fluid starting:translate-y-1.5 starting:opacity-0 motion-reduce:starting:translate-y-0"
          style={{ transitionDelay: `${120 + i * 40}ms` }}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

async function share(item: Item) {
  const data = {
    title: item.title,
    text: `${item.title} · Fala, Canoas`,
    url: `${location.origin}${itemPath(item.id)}`,
  };
  if (typeof navigator.canShare === "function" && navigator.canShare(data)) {
    // Closing the share sheet rejects; nothing to report.
    await navigator.share(data).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(data.url);
  toast("Link copiado.");
}

function ReportDone({
  muni,
  done: { item, digest, tracking },
  phone,
  head,
  onView,
}: {
  muni: Municipality;
  done: Created;
  phone: boolean;
  head: Head;
  onView: (id: string, key?: string) => void;
}) {
  if (tracking)
    return <GuestDone muni={muni} item={item} tracking={tracking} phone={phone} head={head} onView={onView} />;
  // Held by the pre-screen: not on the map yet, nothing to share.
  const held = item.moderation === "pending";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header head={head} title={held ? "Recebido" : "Registrado"} focus>
        {held
          ? "Fica em análise até alguém da moderação olhar. Depois, entra no mapa e no resumo diário."
          : item.pendingPhotos
            ? `Já está no mapa. As fotos aparecem depois que a moderação olhar; aí ele entra no resumo diário, às ${muni.digestHour}h, e o relógio começa.`
            : `Entra no resumo ${digest === "hoje" ? "de hoje" : "de amanhã"}, às ${muni.digestHour}h. O relógio começa no envio.`}
      </Header>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 rounded-xl border border-hairline bg-muted p-4">
          <div className="flex items-center gap-3.5">
            <SuccessMark />
            <span className="grid gap-1">
              <span className="text-caption text-muted-foreground">Código do registro</span>
              <RisingCode code={item.id} />
            </span>
          </div>
          <p className="border-t border-hairline pt-3 text-sm text-ink-2">
            <b className="font-medium text-foreground">{item.title}</b> · {whereOf(item, muni)}
          </p>
        </div>
        {item.moderation === "pending" && (
          <p className="rounded-xl border border-hairline bg-muted px-3.5 py-2.5 text-sm text-ink-2">
            <b className="font-medium text-foreground">Em análise.</b> A verificação automática segurou o registro para
            alguém olhar antes de publicar: ele pode ter um telefone, um CPF, o nome de uma pessoa ou uma ofensa. A
            decisão aparece na página dele.
          </p>
        )}
        {/* Until the digest service runs (research/BUILD.md, 3.1), nothing reaches the Prefeitura. */}
        <p className="rounded-xl border border-dashed border-hairline-strong px-3.5 py-2.5 text-caption text-ink-2">
          Protótipo: o registro fica salvo, mas o resumo diário ainda não vai à Prefeitura. O relógio só começa quando
          ele for enviado.
        </p>
      </div>
      <div
        className={cn(
          "shrink-0 gap-2 border-t border-hairline bg-muted px-5 py-3.5",
          phone ? "pb-safe-3.5 grid" : "flex justify-end",
        )}
      >
        {!held && (
          <Button variant="outline" size={phone ? "xl" : "lg"} onClick={() => void share(item)}>
            <Share2 data-icon="inline-start" />
            Compartilhar
          </Button>
        )}
        <Button
          variant="signal"
          size={phone ? "xl" : "lg"}
          onClick={() => {
            closeReport();
            onView(item.id);
          }}
        >
          {!held && <MapIcon data-icon="inline-start" />}
          {held ? "Abrir o registro" : "Ver no mapa"}
        </Button>
      </div>
    </div>
  );
}

/**
 * A guest pin's done screen (round 2): it isn't on the map yet, and the secret link is the only way
 * back to it. Nothing to share until moderation publishes it.
 */
function GuestDone({
  muni,
  item,
  tracking,
  phone,
  head,
  onView,
}: {
  muni: Municipality;
  item: Item;
  tracking: string;
  phone: boolean;
  head: Head;
  onView: (id: string, key?: string) => void;
}) {
  const url = typeof location === "undefined" ? tracking : `${location.origin}${tracking}`;
  const key = new URL(url, "https://fala.invalid").searchParams.get("chave") ?? undefined;
  const copy = () =>
    void navigator.clipboard.writeText(url).then(
      () => toast("Link copiado."),
      () => toast("Não deu para copiar. Selecione o link e copie."),
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header head={head} title="Recebido" focus>
        Fica em análise até a moderação aprovar. Depois, entra no mapa e no resumo diário à Prefeitura.
      </Header>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 rounded-xl border border-hairline bg-muted p-4">
          <div className="flex items-center gap-3.5">
            <SuccessMark />
            <span className="grid gap-1">
              <span className="text-caption text-muted-foreground">Código do registro</span>
              <RisingCode code={item.id} />
            </span>
          </div>
          <p className="border-t border-hairline pt-3 text-sm text-ink-2">
            <b className="font-medium text-foreground">{item.title}</b> · {whereOf(item, muni)}
          </p>
        </div>
        <section aria-labelledby="guardar" className="grid gap-2">
          <h3 id="guardar" className="text-sm font-semibold">
            Guarde este link
          </h3>
          <p className="text-caption text-ink-2">
            Sem conta, ele é o único jeito de acompanhar o registro. Quem tiver o link vê o registro enquanto ele está
            em análise; ninguém vê quem enviou.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="Link para acompanhar" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={copy}>
              <Copy data-icon="inline-start" />
              Copiar
            </Button>
          </div>
        </section>
      </div>
      <div
        className={cn(
          "shrink-0 gap-2 border-t border-hairline bg-muted px-5 py-3.5",
          phone ? "pb-safe-3.5 grid" : "flex justify-end",
        )}
      >
        <Button
          variant="signal"
          size={phone ? "xl" : "lg"}
          onClick={() => {
            closeReport();
            onView(item.id, key);
          }}
        >
          Abrir o registro
        </Button>
      </div>
    </div>
  );
}
