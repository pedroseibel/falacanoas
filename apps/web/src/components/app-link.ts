import type { MouseEvent } from "react";

/** A real link (new tab and copy-link still work) that a plain click keeps inside the app. */
export interface AppLink {
  href: string;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** Makes such a link for any address: the route adapter provides it, since it owns navigation. */
export type Go = (href: string) => AppLink;
