import { createFileRoute } from "@tanstack/react-router";
import { photoAccess } from "@/server/photo-access";
import { getPhoto, isPhotoKey } from "@/server/photos";

const missing = () => new Response("Foto não encontrada.", { status: 404 });

/**
 * Report photos, already stripped of metadata, streamed from Storage. Only approved photos on
 * published pins are public; moderators see the rest; anyone else gets a 404, so a held or removed
 * photo's address leads nowhere. Public copies are cached for an hour, not forever, so a takedown
 * reaches browsers that already loaded the photo; the key never changes, so revalidating is cheap.
 */
export const Route = createFileRoute("/api/fotos/$key")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!isPhotoKey(params.key)) return missing();
        const audience = await photoAccess(params.key);
        if (!audience) return missing();
        const headers = {
          "content-type": params.key.endsWith(".webp") ? "image/webp" : "image/jpeg",
          "cache-control": audience === "public" ? "public, max-age=3600" : "private, no-store",
          etag: `"${params.key}"`,
          "x-content-type-options": "nosniff",
        };
        if (audience === "public" && request.headers.get("if-none-match") === headers.etag)
          return new Response(null, { status: 304, headers });
        const photo = await getPhoto(params.key);
        return photo ? new Response(photo.body, { headers }) : missing();
      },
    },
  },
});
