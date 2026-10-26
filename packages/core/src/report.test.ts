import { describe, expect, test } from "bun:test";
import {
  awaitingDigest,
  confirmationStatus,
  confirmItem,
  digestDay,
  findDuplicate,
  itemFromReport,
  legalDeadline,
  newItemId,
  reportSchema,
  reportTitle,
  type ReportFields,
} from "./report";
import type { Item, Municipality } from "./types";

// One square bairro around (-51.15, -29.95), about 2 km a side.
const square = [
  [
    [-51.16, -29.96],
    [-51.14, -29.96],
    [-51.14, -29.94],
    [-51.16, -29.94],
    [-51.16, -29.96],
  ],
];
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
    { key: "buraco", label: "Buraco na rua", group: "ruas", agency: "Obras", kind: "occurrence" },
    { key: "poste", label: "Poste apagado", group: "luz", agency: "Iluminação", kind: "occurrence" },
    { key: "alaga", label: "Rua que alaga", group: "agua", agency: "Obras", kind: "occurrence", asks: "flooding" },
    { key: "questao", label: "Questão pública", group: "questoes", agency: null, kind: "public_issue" },
  ],
  filterGroups: [],
  neighborhoods: [{ slug: "centro", name: "Centro", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] }],
  geo: {
    neighborhoods: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { slug: "centro", name: "Centro" },
          geometry: { type: "Polygon", coordinates: square },
        },
      ],
    },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "teste.invalid" },
  emergency: {
    civilDefense: [{ display: "(51) 98255-0805", tel: "51982550805" }],
    fire: { display: "193", tel: "193" },
  },
};

const photo = () => new File([new Uint8Array([1, 2, 3])], "foto.webp", { type: "image/webp" });
const fields = (patch: Partial<ReportFields> = {}): ReportFields => ({
  kind: "occurrence",
  photos: [photo()],
  category: "buraco",
  title: "",
  reach: "place",
  place: "",
  reference: "",
  flooding: {},
  neighborhood: "",
  location: [-51.15, -29.95],
  text: "",
  visibility: "pseudonymous",
  ...patch,
});
const issue = (patch: Partial<ReportFields>) =>
  fields({ kind: "public_issue", photos: [], category: "", title: "UBS sem pediatra às terças", ...patch });
const problems = (v: ReportFields) =>
  Object.fromEntries((reportSchema(muni).safeParse(v).error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));

describe("reportSchema", () => {
  test("a problem with a photo, a type and a place is valid", () => expect(problems(fields())).toEqual({}));
  test("a problem needs a photo, a type and a place", () =>
    expect(Object.keys(problems(fields({ photos: [], category: "", location: null })))).toEqual([
      "photos",
      "category",
      "location",
    ]));
  test("a questão pública is not a problem type", () =>
    expect(Object.keys(problems(fields({ category: "questao" })))).toEqual(["category"]));
  test("points outside the municipality are refused", () =>
    expect(problems(fields({ location: [-51.3, -29.95] })).location).toContain("fora de Teste"));
  test("more than four photos are refused", () =>
    expect(Object.keys(problems(fields({ photos: [photo(), photo(), photo(), photo(), photo()] })))).toEqual([
      "photos",
    ]));
  test("text is capped at 280 characters", () =>
    expect(Object.keys(problems(fields({ text: "a".repeat(281) })))).toEqual(["text"]));
  test("only WebP and JPEG photos are accepted", () =>
    expect(Object.keys(problems(fields({ photos: [new File(["x"], "a.png", { type: "image/png" })] })))).toEqual([
      "photos",
    ]));

  test("a questão pública needs a title but no photo", () => {
    expect(problems(issue({}))).toEqual({});
    expect(Object.keys(problems(issue({ title: "UBS" })))).toEqual(["title"]);
  });
  test("a questão about a bairro needs the bairro, not a place", () => {
    expect(problems(issue({ reach: "neighborhood", neighborhood: "centro", location: null }))).toEqual({});
    expect(Object.keys(problems(issue({ reach: "neighborhood", neighborhood: "", location: null })))).toEqual([
      "neighborhood",
    ]);
  });
  test("a city-wide questão needs nothing else", () =>
    expect(problems(issue({ reach: "municipality", location: null }))).toEqual({}));
});

const base: Item = {
  id: "AAAAA",
  kind: "occurrence",
  category: "buraco",
  title: "Buraco",
  text: "",
  neighborhood: "centro",
  scope: { type: "point", lng: -51.15, lat: -29.95 },
  days: 10,
  updatedMinutesAgo: 60,
  confirmations: 2,
  followers: 1,
  updates: 0,
  photos: [],
  visibility: "pseudonymous",
  author: "garça-do-sinos",
  community: "reported",
  official: null,
};
const item = (patch: Partial<Item>): Item => ({ ...base, ...patch });

describe("findDuplicate", () => {
  // 0.0003° of latitude is about 33 m.
  const near = item({ id: "NEAR1", scope: { type: "point", lng: -51.15, lat: -29.9497 } });
  const nearer = item({ id: "NEAR2", scope: { type: "point", lng: -51.15, lat: -29.9499 } });
  const far = item({ id: "FAR01", scope: { type: "point", lng: -51.15, lat: -29.948 } });
  test("finds the nearest open item of the same type within 50 m", () => {
    const d = findDuplicate([far, near, nearer], "buraco", [-51.15, -29.95]);
    expect(d?.item.id).toBe("NEAR2");
    expect(Math.round(d?.meters ?? 0)).toBe(11);
  });
  test("ignores other types, resolved items and dismissed ones", () => {
    expect(findDuplicate([near], "poste", [-51.15, -29.95])).toBeNull();
    expect(findDuplicate([item({ ...near, community: "resolved" })], "buraco", [-51.15, -29.95])).toBeNull();
    expect(findDuplicate([near, nearer], "buraco", [-51.15, -29.95], { ignore: ["NEAR2"] })?.item.id).toBe("NEAR1");
  });
  test("nothing beyond the radius", () => expect(findDuplicate([far], "buraco", [-51.15, -29.95])).toBeNull());
});

describe("ids and titles", () => {
  test("ids are five readable characters", () => expect(newItemId([0, 1, 2, 3, 4])).toBe("ACDEF"));
  test("the title is the first sentence, capitalised", () =>
    expect(reportTitle("a água chega no banco da parada. Faz um mês.", "Rua que alaga")).toBe(
      "A água chega no banco da parada",
    ));
  test("no text falls back to the category", () => expect(reportTitle("  ", "Buraco na rua")).toBe("Buraco na rua"));
  test("long sentences are cut at a word", () =>
    expect(reportTitle("buraco enorme bem na frente da escola", "x", 20)).toBe("Buraco enorme bem…"));
});

describe("digestDay", () => {
  test("before 18h in Canoas it goes in today's digest", () =>
    expect(digestDay(new Date("2026-10-12T20:59:00Z"), muni)).toBe("hoje"));
  test("from 18h on it waits for tomorrow's", () =>
    expect(digestDay(new Date("2026-10-12T21:00:00Z"), muni)).toBe("amanhã"));
});

describe("itemFromReport", () => {
  const now = new Date("2026-10-12T17:20:00Z");
  const ctx = { id: "ACDEF", nick: "garça-do-sinos", photos: ["/api/fotos/a.webp"], now };
  test("a problem becomes a point item awaiting its first digest", () => {
    const it = itemFromReport(fields({ text: "Buraco fundo. Já furou pneu." }), muni, ctx);
    expect(it).toMatchObject({
      id: "ACDEF",
      kind: "occurrence",
      title: "Buraco fundo",
      neighborhood: "centro",
      scope: { type: "point", lng: -51.15, lat: -29.95 },
      community: "reported",
      author: "garça-do-sinos",
      days: 0,
    });
    expect(it.photos).toEqual([{ src: "/api/fotos/a.webp", takenAt: "12 out · 14:20", by: "garça-do-sinos" }]);
    expect(it.events).toEqual([
      { at: "12 out · 14:20", actor: "garça-do-sinos", kind: "created", text: "Registrou com foto." },
    ]);
    expect(awaitingDigest(it)).toBeTrue();
  });
  test("the water answers stay on a street that floods, and nowhere else", () => {
    const flooding = { cause: "valeta" as const, raining: true };
    expect(itemFromReport(fields({ category: "alaga", flooding }), muni, ctx).flooding).toEqual(flooding);
    expect(itemFromReport(fields({ category: "buraco", flooding }), muni, ctx).flooding).toBeUndefined();
    expect(itemFromReport(fields({ category: "alaga" }), muni, ctx)).not.toHaveProperty("flooding");
  });
  test("Anônimo keeps the apelido off the item, its photos and its history", () => {
    const it = itemFromReport(fields({ visibility: "anonymous" }), muni, ctx);
    expect(it.author).toBeNull();
    expect(JSON.stringify(it)).not.toContain("garça");
  });
  test("a questão about a named place keeps the name", () => {
    const it = itemFromReport(
      fields({ kind: "public_issue", title: "UBS sem pediatra", place: "UBS Centro", category: "" }),
      muni,
      ctx,
    );
    expect(it.category).toBe("questao");
    expect(it.scope).toEqual({ type: "place", label: "UBS Centro", lng: -51.15, lat: -29.95 });
  });
  test("a questão about the city has no bairro and no point", () => {
    const it = itemFromReport(
      fields({ kind: "public_issue", title: "Ônibus lotados", reach: "municipality", location: null }),
      muni,
      ctx,
    );
    expect(it.scope).toEqual({ type: "municipality" });
    expect(it.neighborhood).toBeNull();
  });
  test("fixtures without stored events count as already sent", () => expect(awaitingDigest(base)).toBeFalse());
});

describe("confirmItem", () => {
  const ctx = {
    by: "biguá-da-praça",
    photos: ["/api/fotos/b.webp"],
    now: new Date("2026-10-12T17:20:00Z"),
    counts: true,
    dateAgo: (d: number) => `${d}d`,
  };
  test("adds a confirmation and the photo, keeping the derived history", () => {
    const it = confirmItem(base, muni, ctx);
    expect(it.confirmations).toBe(3);
    expect(it.community).toBe("confirmed");
    expect(it.photos.map((p) => p.src)).toEqual(["/api/fotos/b.webp"]);
    expect(it.events?.map((e) => e.kind)).toEqual(["created", "sent_to_authority", "confirmed", "photo_added"]);
  });
  test("a second confirmation from the same person only adds the photo", () => {
    expect(confirmItem(base, muni, { ...ctx, counts: false }).confirmations).toBe(2);
    expect(confirmItem(base, muni, { ...ctx, counts: false, photos: [] })).toBe(base);
  });
});

describe("legalDeadline", () => {
  const at = new Date("2026-09-11T13:02:00Z");
  test("30 days from the protocol, extendable once by 30", () => {
    const d = legalDeadline(at, new Date("2026-09-20T12:00:00Z"));
    expect(d.due.toISOString()).toBe("2026-10-11T13:02:00.000Z");
    expect(d.extendedDue.toISOString()).toBe("2026-11-10T13:02:00.000Z");
    expect(d.daysLeft).toBe(22);
    expect(d.overdue).toBeFalse();
  });
  test("past the date it is overdue", () => {
    const d = legalDeadline(at, new Date("2026-10-13T14:00:00Z"));
    expect(d.overdue).toBeTrue();
    expect(d.daysLeft).toBe(-2);
  });
});

describe("confirmationStatus", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 36e5);
  test("a phone verified 72 h ago counts", () =>
    expect(confirmationStatus({ alreadyConfirmed: false, phoneVerifiedAt: hoursAgo(72), now })).toBe("counts"));
  test("a phone verified less than 72 h ago doesn't count yet", () =>
    expect(confirmationStatus({ alreadyConfirmed: false, phoneVerifiedAt: hoursAgo(71), now })).toBe("too-new"));
  test("no verification time doesn't count", () =>
    expect(confirmationStatus({ alreadyConfirmed: false, phoneVerifiedAt: null, now })).toBe("too-new"));
  test("one per account, the author included", () =>
    expect(confirmationStatus({ alreadyConfirmed: true, phoneVerifiedAt: hoursAgo(500), now })).toBe("already"));
});

describe("digest dates", () => {
  test("a new report waits for its first digest", () => {
    const it = itemFromReport(fields(), muni, { id: "ACDEF", nick: "x-y-z", photos: [], now: new Date() });
    expect(it.sentAt).toBeNull();
    expect(it.protocol).toBeNull();
    expect(awaitingDigest(it)).toBeTrue();
  });
  test("once sent, it no longer waits", () =>
    expect(awaitingDigest(item({ sentAt: "2026-10-12T21:00:00Z", events: [] }))).toBeFalse());
});
