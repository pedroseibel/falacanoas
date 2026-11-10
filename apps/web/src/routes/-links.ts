import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import type { AppLink, Go } from "@/components/app-link";

const plainClick = (e: MouseEvent<HTMLAnchorElement>) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Any address as a real link (new tab and copy-link still work) that a plain click keeps in the app. */
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

/** One such link: the way back out of a page that stands alone. */
export const useBackLink = (href: string): AppLink => useGo()(href);
