import { canoas } from "@fala/instance-canoas";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { monthlyReports } from "./db/schema";

const missing = () => new Response("Relatório não encontrado.", { status: 404 });

/** One month's report as a PDF, for /api/relatorio/$mes. Public; it never changes once built. Server-only. */
export async function monthlyPdf(month: string): Promise<Response> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return missing();
  const [row] = await db
    .select({ pdf: monthlyReports.pdf, sha256: monthlyReports.pdfSha256 })
    .from(monthlyReports)
    .where(eq(monthlyReports.month, month));
  if (!row) return missing();
  const name = `Relatorio-mensal-${month}-${canoas.branding.name.replace(/[^A-Za-z]+/g, "-")}.pdf`;
  return new Response(new Uint8Array(row.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "public, max-age=86400",
      etag: `"${row.sha256}"`,
      "x-content-type-options": "nosniff",
    },
  });
}
