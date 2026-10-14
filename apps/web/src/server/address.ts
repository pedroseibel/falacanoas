import { haversine, type LngLat } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { items } from "./db/schema";

/**
 * The street and number near a report's point, looked up once, right after it's registered
 * (research/digest-pdf; research/maps): what the resumo and the page show beside the map. One call per
 * report to OpenStreetMap's Nominatim, from the server, so only the point goes (never who sent it);
 * never repeated, never from a job (its usage policy: at most one request a second, results kept).
 * GEOCODER_URL points elsewhere (a self-hosted Nominatim); GEOCODER=off turns it off. Server-only.
 */

const DEFAULT_URL = "https://nominatim.openstreetmap.org";
/** A house number only when the address found is this close to the point; the street, within 150 m. */
const NUMBER_METERS = 40;
const STREET_METERS = 150;

interface NominatimReverse {
  lat?: string;
  lon?: string;
  address?: Record<string, string | undefined>;
}

const isReverse = (v: unknown): v is NominatimReverse => typeof v === "object" && v !== null && !Array.isArray(v);

/** "Rua Tiradentes, 123", "Rua Tiradentes", or null when nothing near enough has a name. */
export function formatAddress(found: unknown, point: LngLat): string | null {
  if (!isReverse(found) || !found.address) return null;
  const a = found.address;
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.square ?? a.path;
  const at: LngLat = [Number(found.lon), Number(found.lat)];
  if (!street || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const meters = haversine(point, at);
  if (meters > STREET_METERS) return null;
  const number = a.house_number?.split(/[;,]/)[0]?.trim();
  return number && meters <= NUMBER_METERS ? `${street}, ${number}` : street;
}

export async function lookupAddress(point: LngLat, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (process.env.GEOCODER === "off") return null;
  const url = new URL("/reverse", process.env.GEOCODER_URL || DEFAULT_URL);
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(point[1]),
    lon: String(point[0]),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "pt-BR",
  }).toString();
  const res = await fetcher(url, {
    // The policy asks for an identifying User-Agent.
    headers: { "user-agent": `${canoas.branding.name} (https://${canoas.branding.domain})` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`geocodificador: ${res.status}`);
  return formatAddress(await res.json(), point);
}

/** Looks the address up and keeps it on the item. Run in the background: the person isn't kept waiting. */
export async function storeAddress(id: string, point: LngLat): Promise<void> {
  const address = await lookupAddress(point);
  if (address) await db.update(items).set({ address }).where(eq(items.id, id));
}
