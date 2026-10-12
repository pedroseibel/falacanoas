import type { Item } from "@fala/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cityQuery, itemQuery, itemViewerQuery } from "@/lib/city";
import { actOnItemFn, followItem } from "@/server/item-actions";
import type { ViewerState } from "@/server/items";
import { DONE_MESSAGE, toActionFormData, type ActionInput } from "./item-actions-model";

type Act = ActionInput extends infer A ? (A extends { id: string } ? Omit<A, "id"> : never) : never;

/**
 * The item page's actions against the server. Signed out (or without an apelido), every action
 * sends the person to sign in and back here instead.
 */
export function useItemActions(it: Item, member: boolean, onSignIn: () => void) {
  const queryClient = useQueryClient();
  const viewer = useQuery({ ...itemViewerQuery(it.id), enabled: member });

  /** The server's copy of the item everywhere it shows: the page, the rail and the map. */
  const remember = (item: Item, state: ViewerState) => {
    queryClient.setQueryData(itemQuery(item.id).queryKey, item);
    queryClient.setQueryData(cityQuery.queryKey, (city) =>
      city ? { ...city, items: city.items.map((i) => (i.id === item.id ? { ...item, events: undefined } : i)) } : city,
    );
    queryClient.setQueryData(itemViewerQuery(item.id).queryKey, state);
  };

  const act = useMutation({
    mutationFn: (input: Act) => actOnItemFn({ data: toActionFormData({ ...input, id: it.id }) }),
    onSuccess: (r, input) => {
      if (!r.ok) return void toast(r.error);
      remember(r.item, r.viewer);
      toast(DONE_MESSAGE[input.type]);
    },
    onError: () => toast("Não deu para enviar agora. Confira a conexão e tente de novo."),
  });

  const follow = useMutation({
    mutationFn: (on: boolean) => followItem({ data: { id: it.id, on } }),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      queryClient.setQueryData(itemViewerQuery(it.id).queryKey, (v) => (v ? { ...v, following: r.following } : v));
      void queryClient.invalidateQueries({ queryKey: itemQuery(it.id).queryKey, exact: true });
      toast(r.following ? "Você vai saber de cada atualização." : "Você deixou de acompanhar.");
    },
    onError: () => toast("Não deu para mudar agora. Tente de novo."),
  });

  return {
    viewer: member ? (viewer.data ?? null) : null,
    /** The action on its way to the server, if any. */
    pending: act.isPending ? act.variables.type : follow.isPending ? "follow" : null,
    run: (input: Act, then?: () => void) => {
      if (!member) return onSignIn();
      act.mutate(input, { onSuccess: (r) => r.ok && then?.() });
    },
    toggleFollow: () => (member ? follow.mutate(!viewer.data?.following) : onSignIn()),
  };
}
