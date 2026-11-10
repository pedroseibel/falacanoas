import type { Item } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { itemViewerQuery } from "@/features/item/queries";
import { accountQuery } from "@/lib/account";
import { cityQuery, itemQuery, useShowItem } from "@/lib/city";
import { actOnItemFn, followItem } from "@/server/item-actions";
import { type Act, DONE_MESSAGE, predictAction, toActionFormData, type ViewerState } from "./item-actions-model";

/**
 * The item page's actions against the server. Signed out (or without an apelido), every action
 * sends the person to sign in and back here instead. The taps (confirming, "continua", "foi
 * resolvido" without a photo, following) show their outcome at once and are undone if the server
 * refuses; text and photos wait for it.
 */
export function useItemActions(it: Item, member: boolean, onSignIn: () => void) {
  const queryClient = useQueryClient();
  const viewer = useQuery({ ...itemViewerQuery(it.id), enabled: member });
  const { data: account } = useQuery(accountQuery);
  const itemKey = itemQuery(it.id).queryKey;
  const viewerKey = itemViewerQuery(it.id).queryKey;

  const showItem = useShowItem();
  /** A guess, or the list's own copy put back: neither has the item's history. */
  const show = (item: Item) => showItem(item, { full: false });

  /** The server's copy of the item and of what this neighbour did with it. */
  const remember = (item: Item, state: ViewerState) => {
    showItem(item);
    queryClient.setQueryData(viewerKey, state);
  };

  /** What the screen showed before a guess, to put back if the server says no. */
  type Before = { item?: Item | null; listed?: Item; viewer: ViewerState | null | undefined };
  const snapshot = (): Before => ({
    item: queryClient.getQueryData(itemKey),
    listed: queryClient.getQueryData(cityQuery.queryKey)?.items.find((i) => i.id === it.id),
    viewer: queryClient.getQueryData(viewerKey),
  });
  const undo = (before: Before | undefined) => {
    if (!before) return;
    if (before.item) queryClient.setQueryData(itemKey, before.item);
    if (before.listed) show(before.listed);
    queryClient.setQueryData(viewerKey, before.viewer);
  };

  const act = useMutation({
    mutationFn: (input: Act) => actOnItemFn({ data: toActionFormData({ ...input, id: it.id }) }),
    onMutate: async (input): Promise<Before | undefined> => {
      const state = queryClient.getQueryData(viewerKey);
      if (!state) return undefined;
      const guess = predictAction(queryClient.getQueryData(itemKey) ?? it, input, state, {
        by: account?.nick ?? "Você",
        now: new Date(),
        timezone: canoas.timezone,
      });
      if (!guess) return undefined;
      // A refetch landing mid-guess would put the old state back.
      await queryClient.cancelQueries({ queryKey: viewerKey, exact: true });
      const before = snapshot();
      show(guess.item);
      queryClient.setQueryData(viewerKey, guess.viewer);
      return before;
    },
    onSuccess: (r, input, before) => {
      if (!r.ok) {
        undo(before);
        return void toast(r.error);
      }
      remember(r.item, r.viewer);
      toast(DONE_MESSAGE[input.type]);
    },
    onError: (_e, _input, before) => {
      undo(before);
      toast("Não deu para enviar agora. Confira a conexão e tente de novo.");
    },
  });

  const follow = useMutation({
    mutationFn: (on: boolean) => followItem({ data: { id: it.id, on } }),
    onMutate: async (on): Promise<Before> => {
      await queryClient.cancelQueries({ queryKey: viewerKey, exact: true });
      // Following doesn't change the item: only the viewer's state goes back on a refusal.
      const before = { viewer: queryClient.getQueryData(viewerKey) };
      queryClient.setQueryData(viewerKey, (v) => (v ? { ...v, following: on } : v));
      return before;
    },
    onSuccess: (r, _on, before) => {
      if (!r.ok) {
        undo(before);
        return void toast(r.error);
      }
      queryClient.setQueryData(viewerKey, (v) => (v ? { ...v, following: r.following } : v));
      void queryClient.invalidateQueries({ queryKey: itemKey, exact: true });
      toast(r.following ? "Você vai saber de cada atualização." : "Você deixou de acompanhar.");
    },
    onError: (_e, _on, before) => {
      undo(before);
      toast("Não deu para mudar agora. Tente de novo.");
    },
  });

  return {
    viewer: member ? (viewer.data ?? null) : null,
    /** The action on its way to the server and not shown yet (a guessed one already is), if any. */
    pending: act.isPending && !act.context ? act.variables.type : null,
    run: (input: Act, then?: () => void) => {
      if (!member) return onSignIn();
      act.mutate(input, { onSuccess: (r) => r.ok && then?.() });
    },
    toggleFollow: () => {
      if (!member) return onSignIn();
      // Shown at once, so the button stays live; a second tap waits for the first to land.
      if (!follow.isPending) follow.mutate(!viewer.data?.following);
    },
  };
}
