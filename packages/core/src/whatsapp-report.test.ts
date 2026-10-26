import { describe, expect, test } from "bun:test";
import type { Municipality } from "./types";
import {
  REPORT_SESSION_MS,
  accountReply,
  afterCheck,
  cancelsReport,
  reportDoneReply,
  reportTurn,
  startsReport,
  type ReportSession,
  type WaMessage,
} from "./whatsapp-report";

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
  emergency: { civilDefense: { display: "(51) 98255-0805", tel: "51982550805" }, fire: { display: "193", tel: "193" } },
};

const t = (text: string): WaMessage => ({ kind: "text", text });
const img = (mediaId: string, caption?: string): WaMessage => ({ kind: "image", mediaId, caption });
const inside: WaMessage = { kind: "location", lat: -29.95, lng: -51.15 };
const outside: WaMessage = { kind: "location", lat: -30.5, lng: -51.15 };

/** Runs messages through the conversation, threading the session, and returns every turn. */
function run(messages: WaMessage[], start: ReportSession | null = null, now = 1_000_000) {
  let session = start;
  return messages.map((m, i) => {
    const turn = reportTurn(session, m, muni, now + i);
    session = turn.session;
    return turn;
  });
}

describe("starting", () => {
  test("REGISTRAR, however typed, or a photo on its own", () => {
    expect(startsReport(t("Registrar!"))).toBeTrue();
    expect(startsReport(t("registrar problema"))).toBeTrue();
    expect(startsReport(img("m1"))).toBeTrue();
    expect(startsReport(t("oi"))).toBeFalse();
    expect(startsReport(inside)).toBeFalse();
  });
  test("anything else, with no report going on, isn't ours", () => {
    expect(reportTurn(null, t("oi"), muni, 0)).toEqual({ session: null, reply: null });
  });
});

describe("a whole report", () => {
  test("photo, place, type, text, reference, then the app checks for a duplicate", () => {
    const turns = run([
      t("REGISTRAR"),
      img("m1"),
      img("m2"),
      inside,
      t("1"),
      t("Buraco fundo na esquina"),
      t("em frente à escola"),
    ]);
    expect(turns[0]?.reply).toContain("Mande uma foto");
    expect(turns[1]?.reply).toContain("Foto recebida");
    expect(turns[3]?.reply).toContain("Lugar marcado");
    expect(turns[3]?.reply).toContain("1. Buraco na rua\n2. Poste apagado");
    // Questões públicas need the app: they aren't offered here.
    expect(turns[3]?.reply).not.toContain("Questão pública");
    expect(turns[4]?.reply).toContain("Buraco na rua.");
    expect(turns[5]?.reply).toContain("ponto de referência");
    const last = turns[6];
    expect(last?.need).toEqual({ kind: "check" });
    expect(last?.session?.draft).toEqual({
      photos: ["m1", "m2"],
      location: [-51.15, -29.95],
      category: "buraco",
      text: "Buraco fundo na esquina",
      reference: "em frente à escola",
      duplicate: null,
    });
  });

  test("no duplicate: the draft is read back, then SIM publishes with the apelido, ANÔNIMO without", () => {
    const checking = run([img("m1", "Poste apagado a noite toda"), inside, t("2"), t("pular"), t("pular")]).at(
      -1,
    )?.session;
    if (!checking) throw new Error("sem sessão");
    const confirm = afterCheck(checking, null, muni, 2_000_000);
    expect(confirm.reply).toContain("Confira: Poste apagado em Centro, 1 foto, “Poste apagado a noite toda”.");
    expect(confirm.reply).toContain("a sua conta continua ligada ao registro");
    expect(reportTurn(confirm.session, t("sim"), muni, 2_000_001).need).toEqual({
      kind: "publish",
      visibility: "pseudonymous",
    });
    expect(reportTurn(confirm.session, t("Anônimo"), muni, 2_000_001).need).toEqual({
      kind: "publish",
      visibility: "anonymous",
    });
  });

  test("a duplicate nearby: 1 adds the photo to it, 2 publishes a new one", () => {
    const checking = run([img("m1"), inside, t("1"), t("pular"), t("pular")]).at(-1)?.session;
    if (!checking) throw new Error("sem sessão");
    const offer = afterCheck(checking, { id: "AB3K2", meters: 32.4, title: "Buraco na rua" }, muni, 2_000_000);
    expect(offer.reply).toContain("Já existe algo parecido a 32 m");
    expect(offer.reply).toContain("https://teste.invalid/o/AB3K2");
    const join = reportTurn(offer.session, t("1"), muni, 2_000_001);
    expect(reportTurn(join.session, t("sim"), muni, 2_000_002).need).toEqual({
      kind: "join",
      itemId: "AB3K2",
      visibility: "pseudonymous",
    });
    const separate = reportTurn(offer.session, t("2"), muni, 2_000_001);
    expect(separate.reply).toContain("Confira:");
    expect(reportTurn(separate.session, t("sim"), muni, 2_000_002).need).toEqual({
      kind: "publish",
      visibility: "pseudonymous",
    });
  });
});

describe("the rules of the form, in a chat", () => {
  test("a photo comes first; a place outside the city is refused", () => {
    expect(run([t("registrar"), inside])[1]?.reply).toContain("Primeiro uma foto");
    expect(run([img("m1"), outside])[1]?.reply).toContain("fica fora de Teste");
  });
  test("four photos at most", () => {
    const turns = run([img("a"), img("b"), img("c"), img("d"), img("e")]);
    expect(turns[4]?.reply).toContain("Já são 4 fotos");
    expect(turns[4]?.session?.draft.photos).toEqual(["a", "b", "c", "d"]);
    expect(turns[4]?.session?.step).toBe("location");
  });
  test("a type by its number only; a text up to 280 characters", () => {
    const [, , wrong] = run([img("a"), inside, t("buraco")]);
    expect(wrong?.reply).toContain("Responda com o número");
    const [, , , long] = run([img("a"), inside, t("1"), t("x".repeat(281))]);
    expect(long?.reply).toContain("no máximo 280");
    expect(long?.need).toBeUndefined();
  });
  test("CANCELAR at any step ends it; a session left alone for 30 minutes starts over", () => {
    const [, cancel] = run([img("a"), t("cancelar")]);
    expect(cancel).toEqual({
      session: null,
      reply: "Registro cancelado. Para começar de novo, mande REGISTRAR ou uma foto.",
    });
    const stale = run([img("a")])[0]?.session ?? null;
    expect(reportTurn(stale, inside, muni, 1_000_000 + REPORT_SESSION_MS + 1)).toEqual({ session: null, reply: null });
  });
});

test("the closing reply: the code and the page; a held one says it waits for moderation", () => {
  expect(reportDoneReply({ kind: "published", id: "AB3K2", digest: "hoje", held: false }, muni)).toContain(
    "Registrado, código AB3K2: https://teste.invalid/o/AB3K2",
  );
  expect(reportDoneReply({ kind: "published", id: "AB3K2", digest: "hoje", held: true }, muni)).toContain(
    "passa pela moderação",
  );
  expect(reportDoneReply({ kind: "refused", error: "Limite de hoje." }, muni)).toBe(
    "Não deu para publicar: Limite de hoje.",
  );
});

describe("around the report", () => {
  test("photos sent together get short replies after the first", () => {
    const turns = run([img("m1"), img("m2"), img("m3"), img("m4")]);
    expect(turns[0]?.reply).toContain("Localização");
    expect(turns[1]?.reply).toBe("2 fotos. Mande mais, ou o lugar.");
    expect(turns[3]?.reply).toBe("4 fotos. Agora o lugar.");
  });

  test("CANCELAR is recognised for the service to route it", () => {
    expect(cancelsReport(t("Cancelar."))).toBeTrue();
    expect(cancelsReport(t("sair"))).toBeFalse();
    expect(cancelsReport(img("m1"))).toBeFalse();
  });

  test("a number without an account learns where to make one", () => {
    expect(accountReply("unlinked", muni)).toContain("https://teste.invalid/entrar");
    expect(accountReply("nick", muni)).toContain("apelido");
    expect(accountReply({ refused: "Sua conta está suspensa." }, muni)).toBe("Sua conta está suspensa.");
  });
});
