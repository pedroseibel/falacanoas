import { describe, expect, test } from "bun:test";
import { reportSchema, type ReportFields } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import {
  JoinSchema,
  fitWithin,
  joinMessage,
  listPt,
  missingParts,
  nearLabel,
  pickerStart,
  readJoinFormData,
  readReportFormData,
  toJoinFormData,
  toReportFormData,
} from "./report-model";

const photo = () => new File([new Uint8Array([1, 2, 3])], "foto.webp", { type: "image/webp" });
const niteroi = canoas.neighborhoods.find((n) => n.slug === "niteroi");
const fields = (patch: Partial<ReportFields> = {}): ReportFields => ({
  kind: "occurrence",
  photos: [photo(), photo()],
  category: "buraco",
  title: "",
  reach: "place",
  place: "",
  neighborhood: "",
  location: niteroi?.center ?? null,
  text: "Buraco fundo",
  visibility: "anonymous",
  ...patch,
});

describe("FormData transport", () => {
  test("a report survives the round trip and still validates", () => {
    const back = readReportFormData(toReportFormData(fields()));
    const parsed = reportSchema(canoas).safeParse(back);
    expect(parsed.success).toBeTrue();
    expect(parsed.data?.photos).toHaveLength(2);
    expect(parsed.data?.visibility).toBe("anonymous");
  });
  test("broken JSON reads as nothing", () => {
    const fd = new FormData();
    fd.set("report", "{oops");
    expect(readReportFormData(fd)).toBeNull();
  });
  test("a join survives the round trip", () => {
    const back = JoinSchema.safeParse(
      readJoinFormData(toJoinFormData({ itemId: "7K3QF", visibility: "pseudonymous", photos: [photo()] })),
    );
    expect(back.data?.itemId).toBe("7K3QF");
    expect(back.data?.photos).toHaveLength(1);
  });
});

describe("missingParts", () => {
  test("a fresh problem lacks a photo, a type and a place", () =>
    expect(listPt(missingParts(fields({ photos: [], category: "", location: null })))).toBe("foto, tipo e lugar"));
  test("nothing is missing from a complete problem", () => expect(missingParts(fields())).toEqual([]));
  test("a questão about a bairro asks for the bairro, not the map", () =>
    expect(missingParts(fields({ kind: "public_issue", title: "", reach: "neighborhood", location: null }))).toEqual([
      "questão",
      "bairro",
    ]));
});

describe("fitWithin", () => {
  test("shrinks the long edge to the limit", () =>
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 }));
  test("portrait too", () => expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 }));
  test("never enlarges", () => expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 }));
});

describe("pickerStart", () => {
  const muni = canoas;
  test("an already placed point wins", () =>
    expect(pickerStart({ value: [-51.1, -29.9], mapView: null, home: "niteroi", muni }).center).toEqual([
      -51.1, -29.9,
    ]));
  test("a zoomed-in main map comes next", () =>
    expect(pickerStart({ value: null, mapView: { center: [-51.2, -29.92], zoom: 15 }, home: "niteroi", muni })).toEqual(
      { center: [-51.2, -29.92], zoom: 16 },
    ));
  test("then the person's bairro, then the city", () => {
    expect(pickerStart({ value: null, mapView: { center: [0, 0], zoom: 12 }, home: "niteroi", muni }).center).toEqual(
      niteroi?.center ?? [0, 0],
    );
    expect(pickerStart({ value: null, mapView: null, home: null, muni }).center).toEqual(muni.center);
  });
});

describe("joinMessage", () => {
  test("a counted confirmation thanks the neighbour", () =>
    expect(joinMessage("counts", true)).toBe("Somado ao registro que já existia. Obrigado."));
  test("a phone verified less than 72 h ago says when it will count", () => {
    expect(joinMessage("too-new", false)).toBe(
      "Sua confirmação passa a contar 72 horas depois de você confirmar o celular.",
    );
    expect(joinMessage("too-new", true)).toStartWith(
      "Sua foto foi para o registro que já existia e aparece depois que a moderação olhar. ",
    );
  });
  test("a repeat confirmation says so, unless a photo was added", () => {
    expect(joinMessage("already", false)).toBe("Você já tinha confirmado este registro.");
    expect(joinMessage("already", true)).toBe(
      "Sua foto foi para o registro que já existia e aparece depois que a moderação olhar.",
    );
  });
});

test("duplicate distances round to 5 m and never read 0", () => {
  expect(nearLabel(2)).toBe("5 m");
  expect(nearLabel(33)).toBe("35 m");
});
