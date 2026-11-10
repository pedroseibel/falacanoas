import { describe, expect, test } from "bun:test";
import { isOpen } from "@fala/core";
import { fixtures } from "@fala/instance-canoas/fixtures";
import {
  ActionInputSchema,
  predictAction,
  readActionFormData,
  refusalMessage,
  toActionFormData,
  toItemAction,
  type ViewerState,
} from "./item-actions-model";

const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], "depois.jpg", { type: "image/jpeg" });

describe("item actions in transit", () => {
  test("round-trips through FormData", () => {
    for (const input of [
      { id: "7K3QF", type: "confirm" as const },
      { id: "7K3QF", type: "update" as const, text: "Piorou com a chuva." },
    ]) {
      expect(ActionInputSchema.parse(readActionFormData(toActionFormData(input)))).toEqual(input);
    }
    const resolved = ActionInputSchema.parse(
      readActionFormData(toActionFormData({ id: "7K3QF", type: "resolved", photos: [photo()] })),
    );
    expect(resolved.type === "resolved" && resolved.photos).toHaveLength(1);
  });

  test("refuses empty updates and photo actions without a photo", () => {
    expect(ActionInputSchema.safeParse({ id: "7K3QF", type: "update", text: "   " }).success).toBeFalse();
    expect(ActionInputSchema.safeParse({ id: "7K3QF", type: "photo", photos: [] }).success).toBeFalse();
  });

  test("hands core the stored photo paths", () => {
    expect(toItemAction({ id: "7K3QF", type: "photo", photos: [photo()] }, ["/api/fotos/a.webp"])).toEqual({
      type: "photo",
      photos: ["/api/fotos/a.webp"],
    });
  });

  test("a refusal says when the person's word starts to count", () => {
    expect(refusalMessage("too-new", "confirm", "2026-10-15T22:42:00.000Z")).toBe(
      "Sua palavra passa a contar em 15 out, 72 horas depois de você confirmar o celular.",
    );
  });
});

describe("predictAction", () => {
  const open = fixtures.items.find((i) => i.kind === "occurrence" && isOpen(i) && i.community === "reported");
  if (!open) throw new Error("fixtures need an open, unconfirmed occurrence");
  const viewer: ViewerState = {
    author: false,
    confirmed: false,
    saidStillToday: false,
    saidResolved: false,
    following: false,
    countsFrom: null,
  };
  const ctx = { by: "ipê-roxo", now: new Date("2026-10-13T15:00:00Z"), timezone: "America/Sao_Paulo" };

  test("a confirmation counts at once and marks the viewer", () => {
    const p = predictAction(open, { type: "confirm" }, viewer, ctx);
    expect(p?.item.confirmations).toBe(open.confirmations + 1);
    expect(p?.item.community).toBe("confirmed");
    expect(p?.item.events?.at(-1)?.actor).toBe("ipê-roxo");
    expect(p?.viewer.confirmed).toBeTrue();
  });

  test("the same refusals as the server: own pin, already confirmed, phone too new", () => {
    expect(predictAction(open, { type: "confirm" }, { ...viewer, author: true }, ctx)).toBeNull();
    expect(predictAction(open, { type: "confirm" }, { ...viewer, confirmed: true }, ctx)).toBeNull();
    expect(predictAction(open, { type: "confirm" }, { ...viewer, countsFrom: "2026-10-15T12:00:00Z" }, ctx)).toBeNull();
  });

  test("“continua” and a photo-less “foi resolvido” are predicted", () => {
    expect(predictAction(open, { type: "still" }, viewer, ctx)?.viewer.saidStillToday).toBeTrue();
    const resolved = predictAction(open, { type: "resolved", photos: [] }, viewer, ctx);
    expect(resolved?.item.community).toBe("apparently_resolved");
    expect(resolved?.viewer.saidResolved).toBeTrue();
  });

  test("text and photos wait for the server", () => {
    expect(predictAction(open, { type: "update", text: "Piorou." }, viewer, ctx)).toBeNull();
    expect(predictAction(open, { type: "photo", photos: [photo()] }, viewer, ctx)).toBeNull();
    expect(predictAction(open, { type: "resolved", photos: [photo()] }, viewer, ctx)).toBeNull();
  });
});
