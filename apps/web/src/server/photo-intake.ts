import { stripImageMetadata } from "@fala/core";
import { putPhoto } from "./photos";

export const PHOTO_ERROR = "Não deu para ler uma das fotos. Tire outra ou escolha outra da galeria.";

/** Strips metadata from every photo, then stores them, but only if all of them are images. */
export async function keepPhotos(files: File[]): Promise<{ keys: string[]; srcs: string[] } | null> {
  const clean = await Promise.all(files.map(async (f) => stripImageMetadata(new Uint8Array(await f.arrayBuffer()))));
  const images = clean.flatMap((image) => (image ? [image] : []));
  if (images.length !== files.length) return null;
  const stored = await Promise.all(images.map((image) => putPhoto(image.bytes, image.type)));
  return { keys: stored.map((p) => p.key), srcs: stored.map((p) => p.src) };
}

/** Server functions that take files receive FormData; anything else is refused. */
export const formData = (data: FormData) => {
  if (!(data instanceof FormData)) throw new Error("Envio inválido.");
  return data;
};
