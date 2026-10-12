import type { ComponentProps } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NativeSelectProps = Omit<ComponentProps<"select">, "size"> & {
  /** lg and xl are the landing page's comfortable controls (48px and 52px). */
  size?: "sm" | "default" | "lg" | "xl";
};

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
  return (
    <div
      className={cn("group/native-select relative w-fit has-[select:disabled]:opacity-50", className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="h-8 w-full min-w-0 cursor-pointer appearance-none invalid:text-muted-foreground rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground hover:border-hairline-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=lg]:h-12 data-[size=lg]:bg-card data-[size=lg]:pr-10.5 data-[size=lg]:pl-3.5 data-[size=lg]:text-base data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5 data-[size=xl]:h-13 data-[size=xl]:bg-card data-[size=xl]:pr-10.5 data-[size=xl]:pl-3.5 data-[size=xl]:text-[1.03125rem] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-[size=lg]:bg-card dark:data-[size=xl]:bg-card"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none group-data-[size=lg]/native-select:right-3.5 group-data-[size=xl]/native-select:right-3.5"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: ComponentProps<"option">) {
  return (
    <option data-slot="native-select-option" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />
  );
}

function NativeSelectOptGroup({ className, ...props }: ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
