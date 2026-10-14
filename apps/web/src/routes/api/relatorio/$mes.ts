import { createFileRoute } from "@tanstack/react-router";
import { monthlyPdf } from "@/server/monthly-pdf";

/** A monthly report per body, as the PDF apps/digest built (see monthlyPdf). */
export const Route = createFileRoute("/api/relatorio/$mes")({
  server: {
    handlers: {
      GET: ({ params }) => monthlyPdf(params.mes),
    },
  },
});
