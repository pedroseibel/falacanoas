import { createFileRoute } from "@tanstack/react-router";
import { getPhoto } from "@/server/photos";

/** Report photos, already stripped of metadata, streamed from Storage. Keys are random and the bytes never change. */
export const Route = createFileRoute("/api/fotos/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const photo = await getPhoto(params.key);
        if (!photo) return new Response("Foto não encontrada.", { status: 404 });
        return new Response(photo.body, {
          headers: {
            "content-type": params.key.endsWith(".webp") ? "image/webp" : "image/jpeg",
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
