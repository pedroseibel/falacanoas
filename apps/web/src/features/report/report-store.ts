import { createStore } from "@tanstack/react-store";

interface ReportState {
  open: boolean;
  /** Bumped on every open, so each report starts from a fresh form (keyed remount). */
  session: number;
}

/** The report dialog, opened from the shell's Registrar (after sign-in, when needed). */
export const reportStore = createStore<ReportState>({ open: false, session: 0 });

export const openReport = () => reportStore.setState((s) => ({ open: true, session: s.session + 1 }));
export const closeReport = () => reportStore.setState((s) => ({ ...s, open: false }));
