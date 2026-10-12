import type { Item, Municipality } from "@fala/core";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { Check, Map as MapIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { whereOf } from "@/features/map/item-card";
import { cityQuery, itemQuery } from "@/lib/city";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { Header, ReportForm, type Author, type Created, type Head } from "./report-form";
import { joinMessage } from "./report-model";
import { closeReport, reportStore } from "./report-store";

export interface ReportDialogProps {
  muni: Municipality;
  items: Item[];
  /** The signed-in, phone-verified person with an apelido; null hides the dialog. */
  author: Author | null;
  /** Server data changed: the route re-syncs the map. */
  onChanged: () => void;
  /** Opens an item on the map (the route adapter owns navigation). */
  onView: (id: string) => void;
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
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>{flow({ Title: DrawerTitle, Description: DrawerDescription })}</DrawerContent>
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
  onChanged,
  onView,
}: Omit<ReportDialogProps, "author"> & { author: Author; phone: boolean; head: Head }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState<Created | null>(null);

  /** Puts the server's copy of the item in the cache, so the rail, the map and the item page show it at once. */
  const remember = (item: Item) => {
    queryClient.setQueryData(cityQuery.queryKey, (city) => {
      if (!city) return city;
      const known = city.items.some((i) => i.id === item.id);
      return { ...city, items: known ? city.items.map((i) => (i.id === item.id ? item : i)) : [item, ...city.items] };
    });
    queryClient.setQueryData(itemQuery(item.id).queryKey, item);
    onChanged();
  };

  if (done) return <ReportDone muni={muni} done={done} phone={phone} head={head} onView={onView} />;
  return (
    <ReportForm
      muni={muni}
      items={items}
      author={author}
      phone={phone}
      head={head}
      onCreated={(r) => {
        remember(r.item);
        setDone(r);
      }}
      onJoined={(r) => {
        remember(r.item);
        closeReport();
        onView(r.item.id);
        toast(joinMessage(r.confirmation, r.withPhoto));
      }}
    />
  );
}

async function share(item: Item) {
  const data = { title: item.title, text: `${item.title} · Fala, Canoas`, url: `${location.origin}/o/${item.id}` };
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
  done: { item, digest },
  phone,
  head,
  onView,
}: {
  muni: Municipality;
  done: Created;
  phone: boolean;
  head: Head;
  onView: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header head={head} title="Registrado">
        Entra no resumo {digest === "hoje" ? "de hoje" : "de amanhã"}, às {muni.digestHour}h. O relógio começa no envio.
      </Header>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
        <div className="grid gap-3 rounded-xl border border-hairline bg-muted p-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-5" aria-hidden="true" />
            </span>
            <span className="grid gap-1">
              <span className="text-caption text-muted-foreground">Código do registro</span>
              <span className="font-mono text-3xl leading-none font-medium tracking-tight">{item.id}</span>
            </span>
          </div>
          <p className="border-t border-hairline pt-3 text-sm text-ink-2">
            <b className="font-medium text-foreground">{item.title}</b> · {whereOf(item, muni)}
          </p>
        </div>
        {/* Until the digest service runs (research/BUILD.md, 3.1), nothing reaches the Prefeitura. */}
        <p className="rounded-xl border border-dashed border-hairline-strong px-3.5 py-2.5 text-caption text-ink-2">
          Protótipo: o registro fica salvo, mas o resumo diário ainda não vai à Prefeitura. O relógio só começa quando
          ele for enviado.
        </p>
      </div>
      <div
        className={cn(
          "shrink-0 gap-2 border-t border-hairline bg-muted px-5 py-3.5",
          phone ? "pb-safe grid" : "flex justify-end",
        )}
      >
        <Button variant="outline" size={phone ? "xl" : "lg"} onClick={() => void share(item)}>
          <Share2 data-icon="inline-start" />
          Compartilhar
        </Button>
        <Button
          variant="signal"
          size={phone ? "xl" : "lg"}
          onClick={() => {
            closeReport();
            onView(item.id);
          }}
        >
          <MapIcon data-icon="inline-start" />
          Ver no mapa
        </Button>
      </div>
    </div>
  );
}
