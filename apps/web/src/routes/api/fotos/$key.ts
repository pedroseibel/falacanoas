import { createFileRoute } from "@tanstack/react-router";
import { getPhoto } from "@/server/store";

/** Report photos, already stripped of metadata. Keys are random and the bytes never change. */
export const Route = createFileRoute("/api/fotos/$key")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const photo = getPhoto(params.key);
        if (!photo) return new Response("Foto não encontrada.", { status: 404 });
        return new Response(photo.bytes, {
          headers: {
            "content-type": photo.type,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
