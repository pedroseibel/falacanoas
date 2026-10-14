import type { Item } from "@fala/core";
import { useQueryClient } from "@tanstack/react-query";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cityQuery, itemQuery } from "@/lib/city";
import { startOutbox } from "./outbox";

/** Runs the report outbox (outbox.ts) while a member is signed in. Renders nothing; the toast speaks. */
export function OutboxRunner({ onView }: { onView: (id: string) => void }) {
  const queryClient = useQueryClient();
  useMountEffect(() =>
    startOutbox({
      onSent: (item: Item) => {
        if (!item.moderation) queryClient.setQueryData(itemQuery(item.id).queryKey, item);
        void queryClient.invalidateQueries({ queryKey: cityQuery.queryKey });
      },
      onView,
    }),
  );
  return null;
}
