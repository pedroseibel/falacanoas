import type { Inbound } from "./conversation";

/**
 * A WhatsApp provider's webhook (Meta's Cloud API or a BSP on it): how to tell its deliveries from
 * forgeries, and the text messages inside one. None is chosen yet (BUILD 3.2, founder input), so
 * production's /webhook answers 501 and nothing is read.
 */
export interface Provider {
  /** The delivery's signature checks out against the provider's secret. */
  verify(request: Request, body: string): Promise<boolean>;
  /** The text messages in a delivery; status updates and media are skipped. */
  parse(body: string): Inbound[];
}

export const provider: Provider | null = null;
