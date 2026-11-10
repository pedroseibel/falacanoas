import { calendarDays, localTime, MONTHS_FULL_PT } from "./format";
import { agencyOf, bairroName, byAgency, categoryLabel, medianIfSampled, onPlacar } from "./logic";
import type { Municipality } from "./types";

/**
 * The monthly report per body (research/BUILD, the functionality list): what residents registered,
 * what reached the Prefeitura and what came of it, in one month, per secretaria. Public. It counts as
 * the Placar does (confirmed reports only, so one person can't move a body's numbers), and its days
 * are the public clock's: from the resumo that carried each report. Built once, just after the month
 * ends, and kept as it was built.
 */

/** A report sent to the Prefeitura, as the monthly report reads it. */
export interface MonthlyRow {
  id: string;
  category: string;
  neighborhood: string | null;
  confirmations: number;
  guest: boolean;
  sentAt: Date;
  /** When neighbours confirmed the fix; null while open. */
  closedAt: Date | null;
  protocolAt: Date | null;
}

export interface MonthlyFigures {
  /** Sent to the Prefeitura during the month, confirmed or not. */
  sent: number;
  /** Of those, how many got a protocol back. */
  protocols: number;
  /** Fixed during the month, as neighbours confirmed it. */
  resolved: number;
  /** Of those, how many within the reference deadline. */
  resolvedWithinDeadline: number;
  /** Median days from the resumo to the confirmed fix; null below three fixes. */
  medianDaysToFix: number | null;
  /** Still open on the month's last day. */
  openAtEnd: number;
  /** Of those, how many past the reference deadline that day. */
  overDeadlineAtEnd: number;
}

export interface MonthlyBody extends MonthlyFigures {
  agency: string;
  /** The longest open on the month's last day, oldest first. */
  oldest: { id: string; category: string; bairro: string | null; days: number }[];
  /** Where the open ones were on the month's last day: bairros with the most first. */
  openByBairro: { bairro: string; open: number; overDeadline: number }[];
}

export interface MonthlyReport {
  /** "2026-10". */
  month: string;
  /** "outubro de 2026". */
  label: string;
  deadlineDays: number;
  bodies: MonthlyBody[];
  totals: MonthlyFigures;
}

const OLDEST = 5;
const BAIRROS = 8;

/** "2026-10" → year and month; null if it isn't one. */
export function parseMonth(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

/** The month before the one `now` falls in, by the instance's clock: what the 1st's run reports on. */
export function previousMonth(now: Date, timezone: string): { year: number; month: number } {
  const t = localTime(now, timezone);
  return t.month === 1 ? { year: t.year - 1, month: 12 } : { year: t.year, month: t.month - 1 };
}

export const monthKey = ({ year, month }: { year: number; month: number }) =>
  `${year}-${String(month).padStart(2, "0")}`;

export function monthlyReport(
  rows: MonthlyRow[],
  muni: Municipality,
  period: { year: number; month: number },
): MonthlyReport {
  const tz = muni.timezone;
  const ym = (d: Date) => {
    const t = localTime(d, tz);
    return t.year * 12 + t.month;
  };
  const target = period.year * 12 + period.month;
  // Noon UTC on the month's last day: the same calendar day in any timezone of the Americas or Europe.
  const lastDay = new Date(Date.UTC(period.year, period.month, 0, 12));
  const counted = (r: MonthlyRow) => onPlacar({ kind: "occurrence", confirmations: r.confirmations, guest: r.guest });

  const figures = (group: MonthlyRow[]): MonthlyFigures & { open: { r: MonthlyRow; days: number }[] } => {
    const sentNow = group.filter((r) => ym(r.sentAt) === target);
    const fixed = group.filter((r) => counted(r) && r.closedAt && ym(r.closedAt) === target);
    const days = fixed.map((r) => calendarDays(r.sentAt, r.closedAt ?? r.sentAt, tz));
    const open = group
      .filter((r) => counted(r) && ym(r.sentAt) <= target && (!r.closedAt || ym(r.closedAt) > target))
      .map((r) => ({ r, days: Math.max(0, calendarDays(r.sentAt, lastDay, tz)) }));
    return {
      sent: sentNow.length,
      protocols: sentNow.filter((r) => r.protocolAt).length,
      resolved: fixed.length,
      resolvedWithinDeadline: days.filter((d) => d <= muni.deadlineDays).length,
      medianDaysToFix: medianIfSampled(days),
      openAtEnd: open.length,
      overDeadlineAtEnd: open.filter((o) => o.days > muni.deadlineDays).length,
      open,
    };
  };

  const relevant = rows.filter((r) => ym(r.sentAt) <= target);
  const groups = new Map<string, MonthlyRow[]>();
  for (const r of relevant) {
    const agency = agencyOf(muni, r.category);
    const group = groups.get(agency);
    if (group) group.push(r);
    else groups.set(agency, [r]);
  }
  const bodies = [...groups]
    .map(([agency, group]): MonthlyBody => {
      const { open, ...f } = figures(group);
      const bairros = new Map<string, { open: number; overDeadline: number }>();
      for (const o of open) {
        const name = bairroName(muni, o.r.neighborhood) ?? "Bairro não identificado";
        const x = bairros.get(name) ?? { open: 0, overDeadline: 0 };
        x.open++;
        if (o.days > muni.deadlineDays) x.overDeadline++;
        bairros.set(name, x);
      }
      return {
        agency,
        ...f,
        openByBairro: [...bairros]
          .map(([bairro, x]) => ({ bairro, ...x }))
          .toSorted(
            (a, b) => b.open - a.open || b.overDeadline - a.overDeadline || a.bairro.localeCompare(b.bairro, "pt-BR"),
          )
          .slice(0, BAIRROS),
        oldest: open
          .toSorted((a, b) => b.days - a.days || a.r.id.localeCompare(b.r.id))
          .slice(0, OLDEST)
          .map(({ r, days }) => ({
            id: r.id,
            category: categoryLabel(muni, r.category),
            bairro: bairroName(muni, r.neighborhood),
            days,
          })),
      };
    })
    .filter((b) => b.sent || b.resolved || b.openAtEnd)
    // Alphabetical, the unrouted bucket last: an order, not a ranking.
    .toSorted((a, b) => byAgency(a.agency, b.agency));
  const { open: _open, ...totals } = figures(relevant);
  return {
    month: monthKey(period),
    label: `${MONTHS_FULL_PT[period.month - 1]} de ${period.year}`,
    deadlineDays: muni.deadlineDays,
    bodies,
    totals,
  };
}
