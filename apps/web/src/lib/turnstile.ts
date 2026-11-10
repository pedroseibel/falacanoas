import { useCallback, useRef } from "react";

/**
 * Cloudflare Turnstile (DECISIONS round 18, Q16): no sign-in code is sent without a token, and the
 * server checks it with Siteverify. The widget runs invisibly ("execute" mode, interaction only) and
 * shows itself only when Cloudflare wants a person to interact. Its slot is `hidden has-[iframe]:block`: before
 * a check the widget leaves only a hidden input there, which still took a gap in the forms' grids.
 */
interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.addEventListener(
      "load",
      () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"))),
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        loading = null;
        reject(new Error("turnstile"));
      },
      { once: true },
    );
    document.head.append(script);
  });
  return loading;
}

export class TurnstileUnavailable extends Error {}

type Pending = { current: { resolve: (t: string) => void; reject: (e: Error) => void } | null };

/** Hands the widget's result to whoever is waiting for a token. */
function settle(pending: Pending, result: string | Error) {
  const p = pending.current;
  pending.current = null;
  if (!p) return;
  if (typeof result === "string") p.resolve(result);
  else p.reject(result);
}

/**
 * `mount` is a ref callback that puts the widget in an element (and removes it on unmount); `token()` runs the check and
 * resolves with a single-use token. Each call gets a fresh one.
 */
export function useTurnstile(siteKey: string, action: string) {
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const pending: Pending = useRef(null);

  const mount = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      let removed = false;
      const loaded = loadTurnstile().then((api) => {
        if (removed) return;
        const id = api.render(el, {
          sitekey: siteKey,
          action,
          execution: "execute",
          appearance: "interaction-only",
          size: "flexible",
          theme: "auto",
          language: "pt-br",
          callback: (t: string) => settle(pending, t),
          "error-callback": () => settle(pending, new TurnstileUnavailable("erro")),
          "timeout-callback": () => settle(pending, new TurnstileUnavailable("tempo")),
        });
        widget.current = { api, id };
      });
      // A blocked script is reported when a token is asked for, not as an unhandled rejection here.
      loaded.catch(() => undefined);
      ready.current = loaded;
      return () => {
        removed = true;
        if (widget.current) widget.current.api.remove(widget.current.id);
        widget.current = null;
      };
    },
    [siteKey, action],
  );

  const token = useCallback(async (): Promise<string> => {
    await (ready.current ?? Promise.reject(new TurnstileUnavailable("sem widget"))).catch(() => {
      throw new TurnstileUnavailable("carregamento");
    });
    const w = widget.current;
    if (!w) throw new TurnstileUnavailable("sem widget");
    const result = new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject };
    });
    w.api.execute(w.id);
    try {
      return await result;
    } finally {
      // A token is single use; the next request needs a fresh run.
      w.api.reset(w.id);
    }
  }, []);

  return { mount, token };
}
