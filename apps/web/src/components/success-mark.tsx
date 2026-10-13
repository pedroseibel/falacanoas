import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The ink check that says something went through. It pops in once, on mount: a rare moment, so it
 * gets the delight budget, from 60% (never from nothing) on the house curve. Reduced motion keeps
 * only the fade.
 */
export function SuccessMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition duration-420 ease-fluid starting:scale-60 starting:opacity-0 motion-reduce:starting:scale-100",
        size === "lg" ? "size-12" : "size-10",
      )}
    >
      <Check className={size === "lg" ? "size-6" : "size-5"} aria-hidden="true" />
    </span>
  );
}
