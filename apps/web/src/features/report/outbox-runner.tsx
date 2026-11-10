import type { Item } from "@fala/core";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useShowItem } from "@/lib/city";
import { startOutbox } from "./outbox";

/** Runs the report outbox (outbox.ts) while a member is signed in. Renders nothing; the toast speaks. */
export function OutboxRunner({ onView }: { onView: (id: string) => void }) {
  const showItem = useShowItem();
  useMountEffect(() =>
    startOutbox({
      onSent: (item: Item) => {
        // A held report waits for moderation: it isn't on the map yet.
        if (!item.moderation) showItem(item);
      },
      onView,
    }),
  );
  return null;
}
