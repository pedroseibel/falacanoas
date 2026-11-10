import type { Item } from "@fala/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ThreadView } from "@/features/forum/thread-view";
import { pinThreadQuery } from "@/features/item/queries";
import { replyToThread } from "@/server/forum";

/**
 * The conversation under a pin (DECISIONS round 5): talk about the problem, apart from the structured
 * history above it. Starts with the first reply.
 */
export function PinConversation({ it, member, onSignIn }: { it: Item; member: boolean; onSignIn: () => void }) {
  const queryClient = useQueryClient();
  const { data: thread } = useQuery(pinThreadQuery(it.id));
  const n = thread?.replies.length ?? 0;
  return (
    <section aria-labelledby="conversa" className="grid gap-1 border-t border-hairline pt-4">
      <h3 id="conversa" className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="size-4" aria-hidden="true" />
        Conversa{" "}
        <small className="text-xs font-normal text-muted-foreground">
          {n ? `${n} ${n === 1 ? "mensagem" : "mensagens"}` : "ninguém falou ainda"}
        </small>
      </h3>
      <ThreadView
        thread={thread ?? null}
        member={member}
        onSignIn={onSignIn}
        placeholder="Pergunte ou conte algo sobre este problema"
        onReply={async (text) => {
          const r = await replyToThread({ data: { itemId: it.id, text } }).catch(() => null);
          if (!r?.ok) {
            toast(r?.error ?? "Não deu para enviar agora. Tente de novo.");
            return false;
          }
          queryClient.setQueryData(pinThreadQuery(it.id).queryKey, r.thread);
          return true;
        }}
      />
    </section>
  );
}
