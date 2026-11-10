import {
  CONFIRMATION_MIN_HOURS,
  ItemIdSchema,
  type LngLat,
  type Municipality,
  PhotoFileSchema,
  REPORT,
  type ReportFields,
  VisibilitySchema,
} from "@fala/core";
import { z } from "zod";

/** Pure pieces of the report flow: transport, hints and the map's starting view. Tested without the DOM. */

export function toReportFormData(v: ReportFields): FormData {
  const { photos, ...fields } = v;
  const fd = new FormData();
  fd.set("report", JSON.stringify(fields));
  for (const p of photos) fd.append("photo", p);
  return fd;
}

/** The server's side of toReportFormData. Whatever arrives is left for the schema to judge. */
export function readReportFormData(fd: FormData): unknown {
  let fields: unknown;
  try {
    fields = JSON.parse(String(fd.get("report") ?? "null"));
  } catch {
    return null;
  }
  // A draft queued on a phone before the flooding questions existed comes without them.
  return typeof fields === "object" && fields !== null ? { flooding: {}, ...fields, photos: fd.getAll("photo") } : null;
}

/** "Confirmar e adicionar sua foto": the existing item, how to sign, and the photos already picked. */
export const JoinSchema = z.object({
  itemId: ItemIdSchema,
  visibility: VisibilitySchema,
  photos: z.array(PhotoFileSchema).max(REPORT.maxPhotos),
});
export type Join = z.infer<typeof JoinSchema>;

export function toJoinFormData(v: Join): FormData {
  const fd = new FormData();
  fd.set("itemId", v.itemId);
  fd.set("visibility", v.visibility);
  for (const p of v.photos) fd.append("photo", p);
  return fd;
}

export const readJoinFormData = (fd: FormData): unknown => ({
  itemId: fd.get("itemId"),
  visibility: fd.get("visibility"),
  photos: fd.getAll("photo"),
});

/** What still stops this report from being published, in the words of the footer hint. */
export function missingParts(v: ReportFields): string[] {
  const out: string[] = [];
  if (v.kind === "occurrence") {
    if (v.photos.length === 0) out.push("foto");
    if (!v.category) out.push("tipo");
    if (!v.location) out.push("lugar");
    return out;
  }
  if (v.title.trim().length < REPORT.minTitle) out.push("questão");
  if (v.reach === "place" && !v.location) out.push("lugar");
  if (v.reach === "neighborhood" && !v.neighborhood) out.push("bairro");
  return out;
}

/**
 * Where the location picker opens: the point already placed; else the main map, if it was zoomed in on
 * a street; else the person's bairro; else the whole city.
 */
export function pickerStart({
  value,
  mapView,
  home,
  muni,
}: {
  value: LngLat | null;
  mapView: { center: LngLat; zoom: number } | null;
  home: string | null;
  muni: Municipality;
}): { center: LngLat; zoom: number } {
  if (value) return { center: value, zoom: 17 };
  if (mapView && mapView.zoom >= 14) return { center: mapView.center, zoom: Math.max(mapView.zoom, 16) };
  const bairro = muni.neighborhoods.find((n) => n.slug === home);
  if (bairro) return { center: bairro.center, zoom: 14.5 };
  return { center: muni.center, zoom: 12.5 };
}

/** What happened when a neighbour joined an existing problem, in the toast's words. */
export function joinMessage(confirmation: "counts" | "already" | "too-new", withPhoto: boolean): string {
  if (confirmation === "counts") return "Somado ao registro que já existia. Obrigado.";
  const photo = withPhoto ? "Sua foto foi para o registro que já existia e aparece depois que a moderação olhar. " : "";
  if (confirmation === "already") return withPhoto ? photo.trim() : "Você já tinha confirmado este registro.";
  return `${photo}Sua confirmação passa a contar ${CONFIRMATION_MIN_HOURS} horas depois de você confirmar o celular.`;
}

/** "a 35 m": duplicates are close by definition, so round to 5 m and never say 0. */
export const nearLabel = (meters: number) => `${Math.max(5, Math.round(meters / 5) * 5)} m`;
