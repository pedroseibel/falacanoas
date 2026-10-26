import { describe, expect, test } from "bun:test";
import { monthlyReport, parseMonth, previousMonth, type MonthlyRow } from "./monthly-report";
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
    { key: "outro", label: "Outro", group: "outros", agency: null, kind: "occurrence" },
  ],
  filterGroups: [],
  neighborhoods: [
    { slug: "centro", name: "Centro", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
    { slug: "fatima", name: "Fátima", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
  ],
  geo: {
    neighborhoods: { type: "FeatureCollection", features: [] },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "fala.example" },
  emergency: {
    civilDefense: [{ display: "(51) 98255-0805", tel: "51982550805" }],
    fire: { display: "193", tel: "193" },
  },
};

/** 18h in Canoas (21h UTC) on that day of 2026. */
const at = (month: number, day: number) => new Date(Date.UTC(2026, month - 1, day, 21));
let n = 0;
const row = (over: Partial<MonthlyRow>): MonthlyRow => ({
  id: `R${String((n += 1)).padStart(4, "0")}`,
  category: "buraco",
  neighborhood: "centro",
  confirmations: 1,
  guest: false,
  sentAt: at(10, 1),
  closedAt: null,
  protocolAt: null,
  ...over,
});
const october = { year: 2026, month: 10 };

describe("the month per body", () => {
  test("sent, protocols, fixes and what was open on the last day", () => {
    const rows = [
      row({ sentAt: at(10, 2), protocolAt: at(10, 3) }),
      row({ sentAt: at(10, 5), closedAt: at(10, 15) }),
      row({ sentAt: at(9, 1), closedAt: at(10, 20) }),
      row({ sentAt: at(10, 7), closedAt: at(10, 9) }),
      row({ sentAt: at(8, 20) }),
      row({ category: "poste", sentAt: at(10, 30) }),
    ];
    const r = monthlyReport(rows, muni, october);
    expect(r).toMatchObject({ month: "2026-10", label: "outubro de 2026", deadlineDays: 30 });
    expect(r.bodies.map((b) => b.agency)).toEqual(["Iluminação Pública", "Secretaria de Obras"]);
    const obras = r.bodies[1];
    expect(obras).toMatchObject({
      sent: 3,
      protocols: 1,
      resolved: 3,
      // 10, 49 and 2 days: two within 30.
      resolvedWithinDeadline: 2,
      medianDaysToFix: 10,
      openAtEnd: 2,
      overDeadlineAtEnd: 1,
    });
    // Sent 20 August, open on 31 October: 72 days.
    expect(obras?.oldest[0]).toEqual({ id: rows[4]?.id ?? "", category: "Buraco na rua", bairro: "Centro", days: 72 });
    expect(r.totals).toMatchObject({ sent: 4, resolved: 3, openAtEnd: 3 });
    expect(obras?.openByBairro).toEqual([{ bairro: "Centro", open: 2, overDeadline: 1 }]);
  });

  test("counts as the Placar does: an unconfirmed report is sent, but doesn't move the figures", () => {
    const r = monthlyReport(
      [row({ confirmations: 0 }), row({ guest: true, confirmations: 1, closedAt: at(10, 4) })],
      muni,
      october,
    );
    expect(r.totals).toMatchObject({ sent: 2, resolved: 0, openAtEnd: 0 });
  });

  test("a median needs three fixes; later months and quiet bodies stay out", () => {
    const r = monthlyReport(
      [
        row({ closedAt: at(10, 3) }),
        row({ sentAt: at(11, 2) }),
        row({ category: "poste", sentAt: at(7, 1), closedAt: at(8, 1) }),
        row({ category: "outro", sentAt: at(10, 10) }),
      ],
      muni,
      october,
    );
    expect(r.bodies.map((b) => b.agency)).toEqual(["Secretaria de Obras", "Sem órgão definido pelo Fala"]);
    expect(r.bodies[0]?.medianDaysToFix).toBeNull();
  });
});

test("which month the 1st reports on, by the instance's clock", () => {
  // 04:00 UTC on 1 November is 01:00 in Canoas: November there, so October is reported.
  expect(previousMonth(new Date("2026-11-01T04:00:00Z"), "America/Sao_Paulo")).toEqual(october);
  // 31 October at 23:30 in Canoas (02:30 UTC on 1 November) is still October.
  expect(previousMonth(new Date("2026-11-01T02:30:00Z"), "America/Sao_Paulo")).toEqual({ year: 2026, month: 9 });
  expect(previousMonth(new Date("2027-01-01T12:00:00Z"), "America/Sao_Paulo")).toEqual({ year: 2026, month: 12 });
  expect(parseMonth("2026-10")).toEqual(october);
  expect(parseMonth("2026-13")).toBeNull();
});
