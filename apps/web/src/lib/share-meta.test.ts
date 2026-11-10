import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { bairroShareMeta, clockText, itemShareMeta } from "./share-meta";

const base = fixtures.items.find((i) => i.photos.length > 0) ?? fixtures.items[0];
if (!base) throw new Error("sem fixtures");
const it = { ...base, id: "7K3QF", days: 43, community: "reported" as const, demo: true };

const content = (meta: ReturnType<typeof itemShareMeta>["meta"], key: string) =>
  meta.find((m) => ("property" in m && m.property === key) || ("name" in m && m.name === key));

describe("itemShareMeta", () => {
  test("absolute links, a versioned card, and the large-image preview", () => {
    const { meta, links } = itemShareMeta(it, canoas);
    expect(content(meta, "og:url")).toEqual({ property: "og:url", content: "https://falacanoas.com.br/o/7K3QF" });
    expect(content(meta, "og:image")).toEqual({
      property: "og:image",
      content: `https://falacanoas.com.br/api/cartao/o/7K3QF?v=43a${it.photos.length}`,
    });
    expect(content(meta, "twitter:card")).toEqual({ name: "twitter:card", content: "summary_large_image" });
    expect(links).toEqual([{ rel: "canonical", href: "https://falacanoas.com.br/o/7K3QF" }]);
  });

  test("demo data says so; the clock reads open or fixed", () => {
    const { meta } = itemShareMeta(it, canoas);
    expect(content(meta, "og:description")).toMatchObject({
      content: expect.stringMatching(/^Exemplo, dados fictícios\./),
    });
    expect(clockText(it)).toBe("43 dias em aberto");
    expect(clockText({ ...it, community: "resolved", days: 1 })).toBe("resolvido em 1 dia");
    expect(content(itemShareMeta({ ...it, demo: false }, canoas).meta, "og:description")).not.toMatchObject({
      content: expect.stringMatching(/Exemplo/),
    });
  });
});

test("bairroShareMeta: the counts in the title, the overdue only when there are some", () => {
  const meta = bairroShareMeta({ name: "Niterói", slug: "niteroi", open: 29, overdue: 12, demo: true }, canoas).meta;
  expect(content(meta, "og:title")).toEqual({
    property: "og:title",
    content: `Niterói: 29 registros abertos, 12 há mais de 30 dias`,
  });
  const calm = bairroShareMeta({ name: "Niterói", slug: "niteroi", open: 1, overdue: 0, demo: false }, canoas).meta;
  expect(content(calm, "og:title")).toEqual({ property: "og:title", content: "Niterói: 1 registro aberto" });
});
