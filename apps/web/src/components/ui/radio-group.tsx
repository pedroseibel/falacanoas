"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn("grid w-full gap-2", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="flex size-4 items-center justify-center">
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

/** Two or three exclusive options shown side by side, each a full label (the landing page's channel picker). */
function RadioGroupSegmented({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group-segmented"
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl border border-hairline bg-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

function RadioGroupSegment({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-segment"
      className={cn(
        "flex min-h-10.5 cursor-pointer items-center justify-center gap-2 rounded-lg py-1.5 text-center text-[0.9375rem] leading-tight font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted data-checked:bg-card data-checked:text-foreground data-checked:shadow-soft [&_svg]:size-4.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** A grid of choices, each a pictogram and a label (the report flow's category picker). The checked tile inverts to ink. */
function RadioGroupTiles({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group-tiles"
      className={cn("grid grid-cols-2 gap-2 compact:grid-cols-3", className)}
      {...props}
    />
  );
}

function RadioGroupTile({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-tile"
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border border-hairline bg-card px-3 py-2 text-left text-sm font-medium text-ink-2 transition-colors outline-none not-data-checked:hover:border-hairline-strong not-data-checked:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-signal-text data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem, RadioGroupSegment, RadioGroupSegmented, RadioGroupTile, RadioGroupTiles };
