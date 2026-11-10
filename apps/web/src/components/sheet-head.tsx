import type { ComponentType, ReactNode } from "react";

/** Title and description parts of the surrounding Dialog (desktop) or Drawer (phone). */
export interface Head {
  Title: ComponentType<{ children: ReactNode }>;
  Description: ComponentType<{ children: ReactNode }>;
}

/** Stable, so React calls it once, when the title mounts, and never pulls focus back later. */
const focusOnMount = (el: HTMLElement | null) => el?.focus({ preventScroll: true });

export function Header({
  head,
  title,
  focus,
  children,
}: {
  head: Head;
  title: string;
  /** A result screen replacing the form: focus moves to its title, so it's announced. */
  focus?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid shrink-0 gap-1 border-b border-hairline px-5 pt-4.5 pr-12 pb-3.5">
      <head.Title {...(focus && { ref: focusOnMount, tabIndex: -1, className: "outline-none" })}>{title}</head.Title>
      <head.Description>{children}</head.Description>
    </div>
  );
}
