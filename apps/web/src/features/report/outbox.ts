import type { Item, ReportFields } from "@fala/core";
import { createStore } from "@tanstack/react-store";
import { toast } from "sonner";
import { createReport, type ReportResult } from "@/server/report";
import {
  afterFailure,
  due,
  DraftSchema,
  FORM_GRACE_MS,
  nextTry,
  outboxLine,
  SEND_TIMEOUT_MS,
  waiting,
  type Draft,
} from "./outbox-model";
import { toReportFormData } from "./report-model";

/**
 * The report form's outbox on the phone (outbox-model.ts): IndexedDB holds each member's report, with
 * its photos, from the moment Publicar is pressed until the server answers. While the app is open it
 * retries on its own: on start, when the connection comes back, when the app returns to the screen,
 * and on a backing-off timer. A toast says what's waiting.
 */

const DB = "fala-outbox";
const STORE = "reports";

let opened: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.addEventListener("upgradeneeded", () => req.result.createObjectStore(STORE, { keyPath: "key" }));
    req.addEventListener("success", () => resolve(req.result));
    req.addEventListener("error", () => reject(req.error));
  });
  return opened;
}

function request<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return database().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, mode);
        const req = f(tx.objectStore(STORE));
        tx.addEventListener("complete", () => resolve(req.result));
        tx.addEventListener("error", () => reject(tx.error));
        tx.addEventListener("abort", () => reject(tx.error));
      }),
  );
}

const putDraft = (d: Draft) => request("readwrite", (s) => s.put(d)).then(() => undefined);
const deleteDraft = (key: string) => request("readwrite", (s) => s.delete(key)).then(() => undefined);
async function allDrafts(): Promise<Draft[]> {
  const rows: unknown[] = await request("readonly", (s) => s.getAll());
  return rows.flatMap((r) => {
    const d = DraftSchema.safeParse(r);
    return d.success ? [d.data] : [];
  });
}

/** How many are waiting, for anything that wants to show it. */
export const outboxStore = createStore<{ drafts: Draft[] }>({ drafts: [] });

const asFile = (b: Blob, i: number) => (b instanceof File ? b : new File([b], `foto-${i + 1}.webp`, { type: b.type }));

/** One try. Throws when the connection fails or takes too long; a refusal comes back as `ok: false`. */
export function sendDraft(d: Draft): Promise<ReportResult> {
  const fd = toReportFormData({ ...d.fields, photos: d.photos.map(asFile) });
  fd.set("chave", d.key);
  return createReport({ data: fd, signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
}

/** Keeps a report before the form sends it; null where the browser won't store it (the form sends anyway). */
export async function keepDraft(fields: ReportFields): Promise<Draft | null> {
  const now = Date.now();
  const { photos, ...rest } = fields;
  const d: Draft = {
    key: crypto.randomUUID(),
    fields: rest,
    photos,
    createdAt: now,
    attempts: 0,
    nextAt: now + FORM_GRACE_MS,
    refused: null,
  };
  return putDraft(d).then(
    () => d,
    () => null,
  );
}

/** The form's send failed on the connection: from now on the outbox tries. */
export async function draftFailed(d: Draft): Promise<void> {
  await putDraft(afterFailure(d, Date.now())).catch(() => undefined);
  await refresh();
}

/** The server answered the form's send, either way: the phone's copy goes. */
export const draftAnswered = (d: Draft) => deleteDraft(d.key).catch(() => undefined);

let hooks: { onSent(item: Item): void; onView(id: string): void } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let draining = false;

function show(drafts: Draft[]) {
  const line = outboxLine(drafts, Date.now());
  if (!line) return void toast.dismiss("outbox");
  const { refused } = line;
  toast(line.text, {
    id: "outbox",
    duration: Number.POSITIVE_INFINITY,
    action: refused
      ? { label: "Tentar de novo", onClick: () => void retry(refused) }
      : { label: "Tentar agora", onClick: () => void drain(true) },
    cancel: refused ? { label: "Descartar", onClick: () => void discard(refused) } : undefined,
  });
}

function schedule(drafts: Draft[]) {
  if (timer) clearTimeout(timer);
  timer = null;
  const at = nextTry(drafts);
  if (at !== null && hooks) timer = setTimeout(() => void drain(), Math.max(1_000, at - Date.now()));
}

async function refresh(): Promise<void> {
  const drafts = await allDrafts().catch((): Draft[] => []);
  outboxStore.setState(() => ({ drafts }));
  show(drafts);
  schedule(drafts);
}

/**
 * Sends what's due on the backoff timer; or everything waiting (`all`) when there's reason to think
 * it'll go now: the connection came back, the app came back to the screen, or the person asked.
 */
async function drain(all = false): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const drafts = await allDrafts();
    const ready = all
      ? waiting(drafts, Date.now())
          .filter((d) => !d.refused)
          .toSorted((a, b) => a.createdAt - b.createdAt)
      : due(drafts, Date.now());
    for (const d of ready) {
      // oxlint-disable-next-line no-await-in-loop -- one at a time: a weak connection carries one upload better.
      const r = await sendDraft(d).catch(() => null);
      if (!r) {
        // oxlint-disable-next-line no-await-in-loop
        await putDraft(afterFailure(d, Date.now()));
        // Still offline: the others would fail the same way.
        break;
      }
      // oxlint-disable-next-line no-await-in-loop
      if (!r.ok) await putDraft({ ...d, refused: r.error });
      else {
        // oxlint-disable-next-line no-await-in-loop
        await deleteDraft(d.key);
        hooks?.onSent(r.item);
        const id = r.item.id;
        toast(`Registro enviado: código ${id}.`, { action: { label: "Ver", onClick: () => hooks?.onView(id) } });
      }
    }
  } catch (e) {
    console.error("caixa de saída", e);
  } finally {
    draining = false;
    await refresh();
  }
}

async function retry(d: Draft) {
  await putDraft({ ...d, refused: null, nextAt: Date.now() }).catch(() => undefined);
  await drain();
}

async function discard(d: Draft) {
  await deleteDraft(d.key).catch(() => undefined);
  await refresh();
}

/** Starts the outbox for a signed-in member; the returned function stops it. */
export function startOutbox(callbacks: { onSent(item: Item): void; onView(id: string): void }): () => void {
  if (typeof indexedDB === "undefined") return () => undefined;
  hooks = callbacks;
  const wake = () => void drain(true);
  const back = () => {
    if (document.visibilityState === "visible") void drain(true);
  };
  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", back);
  void drain(true);
  return () => {
    hooks = null;
    if (timer) clearTimeout(timer);
    timer = null;
    window.removeEventListener("online", wake);
    document.removeEventListener("visibilitychange", back);
  };
}
