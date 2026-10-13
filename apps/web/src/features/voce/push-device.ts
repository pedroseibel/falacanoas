import { deletePushSubscription, getPushKey, savePushSubscription } from "@/server/push";
import type { PushFacts } from "./push-state";

/**
 * This browser's side of notifications (BUILD 4.2): permission, the service worker's push
 * subscription, and telling the server. In development the service worker isn't registered on load,
 * so turning notifications on registers it.
 */

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const standalone = () =>
  matchMedia("(display-mode: standalone)").matches || Reflect.get(navigator, "standalone") === true;

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function readPushFacts(): Promise<PushFacts> {
  return {
    supported: supported(),
    ios: isIos(),
    standalone: standalone(),
    configured: Boolean(await getPushKey()),
    permission: supported() ? Notification.permission : null,
    subscribed: Boolean(await currentSubscription()),
  };
}

/** Asks permission, subscribes this browser, and stores the subscription for the account. */
export async function turnOnPush(): Promise<void> {
  const key = await getPushKey();
  if (!key) throw new Error("Os avisos ainda não estão ligados nesta versão.");
  const permission = await Notification.requestPermission();
  if (permission === "denied")
    throw new Error("Os avisos foram bloqueados. Libere nas configurações do navegador para este site.");
  if (permission !== "granted")
    throw new Error("Para receber avisos, permita as notificações quando o navegador pedir.");
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const json = sub.toJSON();
  const r = await savePushSubscription({
    data: { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } },
  });
  if (!r.ok) {
    await sub.unsubscribe();
    throw new Error(r.error);
  }
}

/** Stops this browser's notifications, here and on the server. Also run on signing out. */
export async function turnOffPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => null);
  await sub.unsubscribe();
}
