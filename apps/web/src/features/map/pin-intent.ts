/**
 * Starts loading a pin before it's opened. A pointer resting on a card or a map pin, or keyboard
 * focus, schedules the load after a short delay, so sweeping across the list doesn't fetch every
 * pin it crosses; a press loads at once, since the click is about to follow. By the time the
 * panel asks for the pin, the request is usually done or already on its way.
 */
export interface PinIntent {
  /** The pointer (or focus) rests on a pin. */
  rest(id: string): void;
  /** It moved off before the delay ran out. */
  leave(): void;
  /** Pointer down or touch start: the click is coming. */
  press(id: string): void;
}

export const INTENT_DELAY_MS = 80;

export function pinIntent(load: (id: string) => void, delay = INTENT_DELAY_MS): PinIntent {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    rest(id) {
      clearTimeout(timer);
      timer = setTimeout(() => load(id), delay);
    },
    leave() {
      clearTimeout(timer);
    },
    press(id) {
      clearTimeout(timer);
      load(id);
    },
  };
}
