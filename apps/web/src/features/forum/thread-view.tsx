import type { Thread } from "@fala/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountQuery } from "@/lib/city";
import { reportPost } from "@/server/forum";

/**
 * A conversation (DECISIONS round 5): replies in order, a reply box, and "Denunciar" on each reply.
 * Shared by the bairro board and the pin's page; the caller says where a reply goes.
 */
export function ThreadView({
  thread,
  member,
  onSignIn,
  onReply,
  placeholder,
  heading,
}: {
  thread: Thread | null;
  member: boolean;
  onSignIn: () => void;
  /** Sends a reply; resolves true when it went through. */
  onReply: (text: string) => Promise<boolean>;
  placeholder: string;
  /** Shown above the replies (the bairro board shows the topic); absent under a pin. */
  heading?: boolean;
}) {
  const you = useQuery(accountQuery).data?.nick ?? null;
  const [draft, setDraft] = useState("");
  const send = useMutation({ mutationFn: onReply, onSuccess: (ok) => ok && setDraft("") });
  const report = useMutation({
    mutationFn: (postId: string) => reportPost({ data: { postId } }),
    onSuccess: (r) => toast(r.ok ? "Denúncia enviada à moderação do bairro." : r.error),
  });

  return (
    <div className="grid gap-1">
      {thread && heading && (
        <>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {thread.by} · {thread.ago}
            {thread.demo && <Badge variant="chip-inline">exemplo</Badge>}
          </p>
          <h3 className="text-xl leading-snug font-semibold tracking-tight text-balance">{thread.title}</h3>
        </>
      )}
      {thread?.replies.map((r) => (
        <div
          key={r.id ?? `${r.by}|${r.ago}|${r.text}`}
          className="group flex gap-2.5 border-t border-hairline py-2.5 first-of-type:mt-2"
        >
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-panel-3 text-2xs font-semibold"
          >
            {r.by.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <b className="font-semibold">{r.by}</b>{" "}
              <span className="ml-1.5 text-xs text-muted-foreground">{r.ago}</span>
            </p>
            <p className="text-sm leading-relaxed break-words text-ink-2">{r.text}</p>
          </div>
          {r.id && r.by !== you && (
            <Button
              variant="quiet"
              size="icon-sm"
              aria-label={`Denunciar a mensagem de ${r.by}`}
              disabled={report.isPending}
              onClick={() => (member ? report.mutate(r.id ?? "") : onSignIn())}
            >
              <Flag />
            </Button>
          )}
        </div>
      ))}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!member) return onSignIn();
          const text = draft.trim();
          if (text) send.mutate(text);
        }}
      >
        <Input
          aria-label="Responder"
          value={draft}
          maxLength={600}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <Button type="submit" disabled={send.isPending}>
          {send.isPending && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          Enviar
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Críticas a serviços e órgãos são bem-vindas. Ataques e nomes de pessoas, não. Moderado por vizinhos do bairro.
      </p>
    </div>
  );
}
