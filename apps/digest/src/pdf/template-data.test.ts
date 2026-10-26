import { describe, expect, test } from "bun:test";
import { digestDocument, type DigestItem } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { scaleBar, templateData, type EntryAssets } from "./template-data";

const item = (id: string, over: Partial<DigestItem> = {}): DigestItem => ({
  id,
  kind: "occurrence",
  category: "buraco",
  title: "Buraco fundo",
  text: "Buraco fundo. Carros desviam pela contramão.",
  neighborhood: "centro",
  scope: { type: "point", lng: -51.18205, lat: -29.91611 },
  days: 0,
  updatedMinutesAgo: 0,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [],
  visibility: "anonymous",
  author: null,
  community: "reported",
  official: null,
  createdAt: "2026-10-13T15:00:00Z",
  ...over,
});

const sentAt = new Date("2026-10-13T21:00:00Z");
const addressee = { to: "Ouvidoria", cc: ["CAC"] };
const assets = (entries: Record<string, Partial<EntryAssets>> = {}) => ({
  overview: null,
  sections: [],
  entries: new Map(
    Object.entries(entries).map(([id, a]) => [
      id,
      { locator: null, street: null, qr: `qr/${id}.svg`, icon: null, photos: [], missingPhotos: 0, ...a },
    ]),
  ),
});

describe("scaleBar", () => {
  test("a round length, about a fifth of the map", () => {
    expect(scaleBar(360)).toEqual({ label: "50 m", fraction: 50 / 360 });
    expect(scaleBar(9000)).toEqual({ label: "2 km", fraction: 2000 / 9000 });
  });
});

describe("templateData", () => {
  test("one report reads in the singular, and the answer cites a real code", () => {
    const doc = digestDocument([item("AB3K2")], canoas, sentAt, 1);
    const { meta } = templateData(doc, assets(), { addressee, sample: false });
    expect(meta.headline).toBe("Hoje, 1 registro novo de moradores de Canoas, para 1 órgão.");
    expect(meta.stats.map((s) => `${s.value} ${s.label}`)).toEqual([
      "1 registro",
      "1 órgão",
      "1 bairro",
      "0 com fotos",
    ]);
    expect(meta.answer).toContain("AB3K2, protocolo");
    expect(meta.clock).toContain("13/10/2026 às 18:00");
  });

  test("an entry's facts: street with distance, confirmations in words, photos only when something's missing", () => {
    const doc = digestDocument(
      [item("AAAAA", { confirmations: 3, photos: [{ src: "/api/fotos/a.webp", takenAt: "", by: "" }] }), item("BBBBB")],
      canoas,
      sentAt,
      1,
    );
    const data = templateData(
      doc,
      assets({
        AAAAA: { street: { name: "Rua Ipiranga", metres: 12 }, missingPhotos: 1 },
        BBBBB: {},
      }),
      { addressee, sample: false },
    );
    const [a, b] = data.sections[0]?.entries ?? [];
    expect(a?.street).toBe("Rua Ipiranga (a 12 m)");
    expect(a?.confirmations).toBe("3 vizinhos confirmaram");
    expect(a?.photosLine).toBe("1 de 1 foto não entrou aqui; todas estão na página pública");
    expect(a?.locatorAlt).toContain("via mais próxima: Rua Ipiranga");
    expect(b?.confirmations).toBe("Nenhuma confirmação ainda");
    expect(b?.photosLine).toBe("Sem foto");
    expect(b?.urlLabel).toBe("falacanoas.com.br/o/BBBBB");
  });
});
