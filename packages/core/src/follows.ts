import { z } from "zod";
import { distance } from "./format";
import { haversine, neighborhoodAt } from "./geo";
import { bairroName, itemLngLat } from "./logic";
import { LngLatSchema, type Item, type LngLat, type Municipality } from "./types";

/**
 * Following places (DECISIONS round 15): home, a route, a bairro, or a single pin. What a follow
 * covers is decided here, so the list in Você, the counts and (later) the notices agree.
 */

export const HOME_RADII = [300, 500, 1000];
/** A route is followed as a corridor this wide on each side of the straight line between its ends. */
export const ROUTE_CORRIDOR_M = 400;
export const MAX_PLACES = 10;

export const FollowPlaceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("home"), at: LngLatSchema, radius: z.number().int().min(100).max(2000) }),
  z.object({ kind: z.literal("neighborhood"), neighborhood: z.string().min(1).max(60) }),
  z.object({ kind: z.literal("route"), from: LngLatSchema, to: LngLatSchema }),
]);
export type FollowPlace = z.infer<typeof FollowPlaceSchema>;

/** Metres from a point to the segment a–b, on a local flat projection (fine at city scale). */
export function toSegment(p: LngLat, a: LngLat, b: LngLat): number {
  const k = Math.cos((p[1] * Math.PI) / 180);
  const xy = ([lng, lat]: LngLat): [number, number] => [lng * k, lat];
  const [px, py] = xy(p);
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return haversine(p, [(ax + t * dx) / k, ay + t * dy]);
}

export function covers(f: FollowPlace, it: Item): boolean {
  if (f.kind === "neighborhood") return it.neighborhood === f.neighborhood;
  const at = itemLngLat(it);
  if (!at) return false;
  if (f.kind === "home") return haversine(at, f.at) <= f.radius;
  return toSegment(at, f.from, f.to) <= ROUTE_CORRIDOR_M;
}

/** "Casa · raio de 500 m", "Bairro Niterói", "Trajeto Niterói → Centro". */
export function followLabel(f: FollowPlace, muni: Municipality): { title: string; detail: string } {
  if (f.kind === "home")
    return {
      title: "Casa",
      detail: `${bairroName(muni, neighborhoodAt(f.at, muni.geo.neighborhoods)) ?? muni.name} · raio de ${distance(f.radius)}`,
    };
  if (f.kind === "neighborhood")
    return {
      title: `Bairro ${bairroName(muni, f.neighborhood) ?? f.neighborhood}`,
      detail: "Tudo o que for registrado",
    };
  const end = (p: LngLat) => bairroName(muni, neighborhoodAt(p, muni.geo.neighborhoods)) ?? "fora dos bairros";
  return {
    title: "Trajeto",
    detail: `${end(f.from)} → ${end(f.to)} · ${distance(ROUTE_CORRIDOR_M)} de cada lado`,
  };
}
