import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import type { BackLink } from "@/features/auth/auth-frame";
import type { Go } from "@/features/not-found/off-map";

const plainClick = (e: MouseEvent<HTMLAnchorElement>) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** A real link back (new tab and copy-link still work); a plain click navigates inside the app. */
export function useBackLink(href: string): BackLink {
  const navigate = useNavigate();
  return {
    href,
    onNavigate: (e: MouseEvent<HTMLAnchorElement>) => {
      if (!plainClick(e)) return;
      e.preventDefault();
      void navigate({ href });
    },
  };
}

/** The same, for pages with many links: any href becomes a real link that a plain click keeps in the app. */
export function useGo(): Go {
  const navigate = useNavigate();
  return (href) => ({
    href,
    onClick: (e) => {
      if (!plainClick(e)) return;
      e.preventDefault();
      void navigate({ href });
    },
  });
}
