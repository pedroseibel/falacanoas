import { useMutation } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportMyData } from "@/server/lifecycle";
import { exportFileName } from "./export-file";

/** "Baixar meus dados" (LGPD art. 18, II and V): everything the account holds, as a JSON file. */
export function DownloadData({ timezone }: { timezone: string }) {
  const download = useMutation({
    mutationFn: async () => {
      const data = await exportMyData();
      if (!data) throw new Error("Entre de novo para baixar seus dados.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(new Date(), timezone);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  return (
    <div className="grid gap-1.5 justify-self-start">
      <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>
        {download.isPending ? (
          <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        ) : (
          <Download data-icon="inline-start" aria-hidden="true" />
        )}
        Baixar meus dados
      </Button>
      {download.isError && (
        <p role="alert" className="text-caption text-destructive">
          {download.error.message === "Entre de novo para baixar seus dados."
            ? download.error.message
            : "Não deu para baixar agora. Tente de novo."}
        </p>
      )}
    </div>
  );
}
