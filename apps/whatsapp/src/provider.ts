import type { Inbound } from "./conversation";

/**
 * A WhatsApp provider's webhook (Meta's Cloud API or a BSP on it): how to tell its deliveries from
 * forgeries, the messages inside one, and the photos they carry. None is chosen yet (BUILD 3.2,
 * founder input), so production's /webhook answers 501 and nothing is read.
 */
export interface Provider {
  /** The delivery's signature checks out against the provider's secret. */
  verify(request: Request, body: string): Promise<boolean>;
  /** Text, photo and location messages in a delivery; status updates and other media are skipped. */
  parse(body: string): Inbound[];
  /** A photo's bytes, by the media id its message carried. */
  media(id: string): Promise<Uint8Array>;
}

export const provider: Provider | null = null;
