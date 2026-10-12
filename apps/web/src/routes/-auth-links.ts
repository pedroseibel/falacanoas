import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import type { BackLink } from "@/features/auth/auth-frame";

/** A real link back (new tab and copy-link still work); a plain click navigates inside the app. */
export function useBackLink(href: string): BackLink {
  const navigate = useNavigate();
  return {
    href,
    onNavigate: (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      void navigate({ href });
    },
  };
}
