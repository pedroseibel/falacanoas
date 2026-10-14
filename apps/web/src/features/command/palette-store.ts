import { createStore } from "@tanstack/react-store";

interface PaletteState {
  open: boolean;
  /** Bumped on every open, so each search starts empty (keyed remount). */
  session: number;
}

/** The ⌘K palette, opened from the shortcut or the header's search. */
export const paletteStore = createStore<PaletteState>({ open: false, session: 0 });

export const openPalette = () => paletteStore.setState((s) => ({ open: true, session: s.session + 1 }));
export const closePalette = () => paletteStore.setState((s) => ({ ...s, open: false }));
export const togglePalette = () => (paletteStore.state.open ? closePalette() : openPalette());
