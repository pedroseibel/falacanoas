import { X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

/**
 * A picked photo, before it is sent. The preview URL is created and revoked by the <img>'s ref
 * callback, in the commit phase (before paint), so it lives exactly as long as the image that shows it.
 */
export function Thumb({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const preview = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );
  return (
    <li className="relative size-20 overflow-hidden rounded-lg border border-hairline bg-panel-3 transition duration-200 ease-fluid starting:scale-96 starting:opacity-0 motion-reduce:starting:scale-100">
      <img ref={preview} alt={`Foto ${index + 1}`} className="size-full object-cover" />
      <Button
        type="button"
        variant="floating"
        size="icon-xs"
        className="absolute top-1 right-1"
        aria-label={`Remover a foto ${index + 1}`}
        onClick={onRemove}
      >
        <X />
      </Button>
    </li>
  );
}
