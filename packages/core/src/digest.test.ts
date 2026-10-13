import { describe, expect, test } from "bun:test";
import { buildDigest, digestible, type DigestItem } from "./digest";
import type { Municipality } from "./types";

const muni: Municipality = {
  slug: "teste",
  name: "Teste",
  state: "RS",
  country: "BR",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  center: [-51.15, -29.95],
  bounds: [
    [-51.2, -30],
    [-51.1, -29.9],
  ],
  deadlineDays: 30,
  digestHour: 18,
  categories: [
    { key: "buraco", label: "Buraco na rua", group: "ruas", agency: "Secretaria de Obras", kind: "occurrence" },
    { key: "poste", label: "Poste apagado", group: "luz", agency: "Iluminação Pública", kind: "occurrence" },
  ],
  filterGroups: [],
  neighborhoods: [{ slug: "centro", name: "Centro", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] }],
  geo: {
    neighborhoods: { type: "FeatureCollection", features: [] },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "fala.example" },
};

const item = (id: string, over: Partial<DigestItem> = {}): DigestItem => ({
  id,
  kind: "occurrence",
  category: "buraco",
  title: "Buraco fundo na faixa da direita",
  text: "Buraco fundo na faixa da direita. Carros desviam pela contramão.",
  neighborhood: "centro",
  scope: { type: "point", lng: -51.15123, lat: -29.95678 },
  days: 0,
  updatedMinutesAgo: 0,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [{ src: "/api/fotos/abc.webp", takenAt: "", by: "vizinha" }],
  visibility: "pseudonymous",
  author: "vizinha-secreta",
  community: "reported",
  official: null,
  createdAt: "2026-10-12T17:20:00Z",
  ...over,
});

const sentAt = new Date("2026-10-12T21:00:00Z"); // 18h in Canoas

describe("buildDigest", () => {
  const d = buildDigest(
    [
      item("AAAAA", { confirmations: 2 }),
      item("BBBBB", { category: "poste", title: "Poste apagado na esquina", text: "" }),
      item("DEMO1", { demo: true }),
    ],
    muni,
    sentAt,
  );

  test("the subject names the instance, the local date and the count, without demo items", () => {
    expect(d.subject).toBe("Fala, Teste · resumo de 12 out 2026 · 2 registros");
    expect(d.itemIds).toEqual(["AAAAA", "BBBBB"]);
    expect(d.text).not.toContain("DEMO1");
  });

  test("grouped by the body responsible, each entry with its code, place, photos and link", () => {
    expect(d.text.indexOf("Iluminação Pública · 1 registro")).toBeLessThan(
      d.text.indexOf("Secretaria de Obras · 1 registro"),
    );
    expect(d.text).toContain("Buraco na rua · Centro · código AAAAA");
    expect(d.text).toContain(
      "Local: -29.95678, -51.15123 · https://www.openstreetmap.org/?mlat=-29.95678&mlon=-51.15123",
    );
    expect(d.text).toContain("Foto 1: https://fala.example/api/fotos/abc.webp");
    expect(d.text).toContain("Registrado em 12/10 às 14:20 · 2 vizinhos confirmaram");
    expect(d.text).toContain("https://fala.example/o/AAAAA");
  });

  test("never who reported", () => {
    expect(d.text).not.toContain("vizinha-secreta");
    expect(d.text).toContain("Quem registrou não é identificado neste resumo.");
  });
});

test("digestible: published, real occurrences not sent yet", () => {
  expect(digestible(item("A"))).toBeTrue();
  expect(digestible({ ...item("A"), sentAt: "2026-10-11T21:00:00Z" })).toBeFalse();
  expect(digestible(item("A", { demo: true }))).toBeFalse();
  expect(digestible(item("A", { moderation: "pending" }))).toBeFalse();
  expect(digestible(item("A", { kind: "public_issue" }))).toBeFalse();
});
