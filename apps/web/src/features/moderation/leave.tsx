import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useState, type ReactNode } from "react";

/** How long a decided case takes to leave: its fade and its row closing (globals.css, .queue-row). */
const LEAVE_MS = 320;
const LEAVE_REDUCED_MS = 120;

/**
 * A card that leaves the moderation queue once decided: `leave(then)` starts the exit and runs `then`
 * (usually refetching the queue) once it's done, so the list doesn't jump under the moderator.
 */
export function useLeave() {
  const [leaving, setLeaving] = useState(false);
  const leave = (then: () => void) => {
    setLeaving(true);
    const reduced = prefersReducedMotion();
    setTimeout(then, reduced ? LEAVE_REDUCED_MS : LEAVE_MS);
  };
  return { leaving, leave };
}

/**
 * The row a queue card sits in. The inner wrapper has no padding or border of its own, so the row can
 * close all the way to nothing while the card fades.
 */
export function QueueRow({ leaving, children }: { leaving: boolean; children: ReactNode }) {
  return (
    <div className="queue-row" data-leaving={leaving || undefined}>
      <div>{children}</div>
    </div>
  );
}
