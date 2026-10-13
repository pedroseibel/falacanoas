import { cn } from "@/lib/utils";

/**
 * A pin that isn't there: a dashed ring (DESIGN.md draws what doesn't exist in dashed hairlines),
 * whose halo breathes three times and stops, like the map's hot pin, in ink instead of orange.
 */
export function GhostPin({ className }: { className?: string }) {
  return (
    <span className="relative inline-block" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border border-dashed border-foreground/50 motion-safe:animate-breathe" />
      <span
        className={cn(
          "relative block size-6 rounded-full border border-dashed border-foreground/70 bg-card motion-safe:animate-in motion-safe:duration-700 motion-safe:ease-fluid motion-safe:zoom-in-50 motion-safe:fade-in",
          className,
        )}
      />
    </span>
  );
}
