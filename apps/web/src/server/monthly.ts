import { createServerFn } from "@tanstack/react-start";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { monthlyReports } from "./db/schema";

/**
 * The monthly reports per body (core monthly-report.ts), as /relatorios lists them. apps/digest
 * builds each on the 1st and they don't change; the PDF itself is served by /api/relatorio/$mes.
 */

const Figures = z.object({
  sent: z.number(),
  resolved: z.number(),
  openAtEnd: z.number(),
  overDeadlineAtEnd: z.number(),
});
const Stored = z.object({
  label: z.string(),
  deadlineDays: z.number(),
  totals: Figures,
  bodies: z.array(z.object({ agency: z.string() })),
});

export interface MonthlyListing {
  month: string;
  label: string;
  generatedAt: string;
  deadlineDays: number;
  totals: z.infer<typeof Figures>;
  bodies: string[];
  bytes: number;
  sha256: string;
}

export const getMonthlyReports = createServerFn({ method: "GET" }).handler(async (): Promise<MonthlyListing[]> => {
  const rows = await db
    .select({
      month: monthlyReports.month,
      generatedAt: monthlyReports.generatedAt,
      figures: monthlyReports.figures,
      bytes: sql<number>`octet_length(${monthlyReports.pdf})`,
      sha256: monthlyReports.pdfSha256,
    })
    .from(monthlyReports)
    .orderBy(desc(monthlyReports.month));
  return rows.flatMap((r) => {
    const f = Stored.safeParse(r.figures);
    if (!f.success) return [];
    return [
      {
        month: r.month,
        label: f.data.label,
        generatedAt: r.generatedAt.toISOString(),
        deadlineDays: f.data.deadlineDays,
        totals: f.data.totals,
        bodies: f.data.bodies.map((b) => b.agency),
        bytes: Number(r.bytes),
        sha256: r.sha256,
      },
    ];
  });
});
