import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";
import { readPushFacts, turnOffPush, turnOnPush } from "./push-device";
import { PUSH_NOTE, pushState } from "./push-state";

const pushKey = ["push-device"];

/** "Avisos neste aparelho" (BUILD 4.2): on, off, or why not here. */
export function PushToggle() {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const facts = useQuery({ queryKey: pushKey, queryFn: readPushFacts, enabled: hydrated });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: pushKey });
  const on = useMutation({
    mutationFn: turnOnPush,
    onSuccess: () => toast("Avisos ligados neste aparelho."),
    onError: (e) => toast(e.message),
    onSettled: refresh,
  });
  const off = useMutation({ mutationFn: turnOffPush, onSettled: refresh });
  if (!facts.data) return null;
  const state = pushState(facts.data);
  const busy = on.isPending || off.isPending;

  return (
    <div className="flex items-start gap-3 border-t border-hairline pt-4">
      {state === "on" ? (
        <Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <BellOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-sm font-medium">Avisos neste aparelho</p>
        <p className="text-xs text-pretty text-muted-foreground">
          {state === "on"
            ? "Ligados. Chegam quando um registro que você acompanha muda, ou quando surge um novo nos seus lugares."
            : state === "off"
              ? "Quando um registro que você acompanha mudar, ou surgir um novo nos seus lugares."
              : PUSH_NOTE[state]}
        </p>
      </div>
      {(state === "on" || state === "off") && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={busy}
          onClick={() => (state === "on" ? off.mutate() : on.mutate())}
        >
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          {state === "on" ? "Desligar" : "Ligar"}
        </Button>
      )}
    </div>
  );
}
