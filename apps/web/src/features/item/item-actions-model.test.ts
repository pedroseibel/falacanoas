import { describe, expect, test } from "bun:test";
import {
  ActionInputSchema,
  readActionFormData,
  refusalMessage,
  toActionFormData,
  toItemAction,
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
