import type { ReportTarget } from "@fala/core";
import { createStore } from "@tanstack/react-store";

/** What "Denunciar" points at: the pin, one of its photos, or one update in its history. */
export type ReportSubject =
  | { itemId: string; target: Extract<ReportTarget, "item"> }
  | { itemId: string; target: Exclude<ReportTarget, "item">; id: string };

interface ContentReportState {
  subject: ReportSubject | null;
  /** Bumped on every open, so each report starts from a fresh form (keyed remount). */
  session: number;
}

/** The report dialog, opened from a photo, an update or the pin's page; mounted once in the app layout. */
export const contentReportStore = createStore<ContentReportState>({ subject: null, session: 0 });

export const openContentReport = (subject: ReportSubject) =>
  contentReportStore.setState((s) => ({ subject, session: s.session + 1 }));
export const closeContentReport = () => contentReportStore.setState((s) => ({ ...s, subject: null }));
