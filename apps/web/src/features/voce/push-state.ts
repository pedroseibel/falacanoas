/**
 * Where this device stands on notifications (BUILD 4.2), decided from plain facts so it can be
 * tested without a browser. The order matters: an iPhone outside the installed app can't subscribe
 * at all, and a blocked permission can only be undone in the browser's settings.
 */
export type PushState = "unsupported" | "install" | "unconfigured" | "blocked" | "off" | "on";

export interface PushFacts {
  /** Service worker, PushManager and Notification all present. */
  supported: boolean;
  /** iOS or iPadOS, where web push needs the app on the home screen. */
  ios: boolean;
  /** Running as the installed app. */
  standalone: boolean;
  /** This instance has a VAPID key. */
  configured: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}

export function pushState(f: PushFacts): PushState {
  if (f.ios && !f.standalone) return "install";
  if (!f.supported) return "unsupported";
  if (!f.configured) return "unconfigured";
  if (f.permission === "denied") return "blocked";
  return f.subscribed && f.permission === "granted" ? "on" : "off";
}

export const PUSH_NOTE: Record<Exclude<PushState, "off" | "on">, string> = {
  unsupported: "Este navegador não recebe avisos.",
  install:
    "No iPhone, os avisos chegam com o app na tela de início: toque em Compartilhar e em Adicionar à Tela de Início.",
  unconfigured: "Os avisos ainda não estão ligados nesta versão.",
  blocked: "Os avisos estão bloqueados para este site. Libere nas configurações do navegador e volte aqui.",
};
