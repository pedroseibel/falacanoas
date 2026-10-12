import { describe, expect, test } from "bun:test";
import { communityLine, deriveEvents, groupStats, isOverDeadline, itemLngLat, median } from "./logic";
import type { Item } from "./types";

const base: Item = {
  id: "TEST1",
  kind: "occurrence",
  category: "buraco",
  title: "Buraco na frente da escola",
  text: "",
  neighborhood: "niteroi",
  scope: { type: "point", lng: -51.17, lat: -29.93 },
  days: 10,
  updatedMinutesAgo: 30,
  confirmations: 4,
  followers: 2,
  updates: 1,
  photos: [],
  visibility: "pseudonymous",
  author: "garça-do-sinos",
  community: "confirmed",
  official: null,
};
const item = (patch: Partial<Item>): Item => ({ ...base, ...patch });

describe("median", () => {
  test("empty is null", () => expect(median([])).toBeNull());
  test("odd count takes the middle", () => expect(median([9, 1, 5])).toBe(5));
  test("even count rounds the mean of the two middles", () => expect(median([1, 2, 3, 6])).toBe(3));
});

describe("communityLine", () => {
  test("confirmed counts confirmations", () => expect(communityLine(base)).toBe("4 confirmam"));
  test("singular verbs for one neighbour", () => {
    expect(communityLine(base, 1)).toBe("1 confirma");
    expect(communityLine(item({ community: "ongoing" }), 1)).toBe("1 diz que continua");
    expect(communityLine(item({ kind: "public_issue" }), 1)).toBe("1 diz: me afeta");
  });
  test("reported waits for confirmation", () =>
    expect(communityLine(item({ community: "reported" }))).toBe("aguardando confirmação"));
  test("public issues speak of being affected", () =>
    expect(communityLine(item({ kind: "public_issue" }))).toBe("4 dizem: me afeta"));
  test("official 'resolved' against an ongoing community is stated, not hidden", () =>
    expect(
      communityLine(
        item({
          community: "ongoing",
          disagreeing: 7,
          official: { status: "resolved", agency: "Iluminação pública", daysAgo: 5 },
        }),
      ),
    ).toBe("Prefeitura: resolvido · 7 dizem que continua"));
});

describe("deadline and position", () => {
  test("open items past the deadline are flagged", () => expect(isOverDeadline(item({ days: 31 }), 30)).toBeTrue());
  test("resolved items are never over the deadline", () =>
    expect(isOverDeadline(item({ days: 90, community: "resolved" }), 30)).toBeFalse());
  test("city-wide issues have no point", () =>
    expect(itemLngLat(item({ scope: { type: "municipality" } }))).toBeNull());
  test("a place with coordinates has a point", () =>
    expect(itemLngLat(item({ scope: { type: "place", label: "UBS", lng: -51, lat: -29 } }))).toEqual([-51, -29]));
});

describe("groupStats", () => {
  const items = [
    item({ id: "A", days: 40 }),
    item({ id: "B", days: 5 }),
    item({ id: "C", days: 12, community: "resolved" }),
    item({ id: "D", days: 20, community: "resolved" }),
    item({ id: "E", days: 45, community: "resolved" }),
    item({ id: "F", kind: "public_issue", days: 3 }),
  ];
  const [stat] = groupStats(items, (i) => i.category, 30);
  test("public issues stay out of the scoreboard", () => expect(stat?.total).toBe(5));
  test("counts open and over-deadline", () => {
    expect(stat?.open).toBe(2);
    expect(stat?.overDeadline).toBe(1);
  });
  test("median only from community-confirmed fixes", () => expect(stat?.medianToFix).toBe(20));
  test("share fixed within the deadline is over all items in the group", () =>
    expect(stat?.fixedWithinDeadlinePct).toBe(40));
  test("below the minimum sample the median is withheld", () =>
    expect(groupStats(items.slice(0, 3), (i) => i.category, 30)[0]?.medianToFix).toBeNull());
});

const dateAgo = (d: number) => `${d}d`;

describe("deriveEvents", () => {
  test("stored events win", () =>
    expect(deriveEvents(item({ events: [{ at: "x", actor: "y", kind: "created", text: "z" }] }), dateAgo)).toHaveLength(
      1,
    ));
  test("anonymous authors stay anonymous", () =>
    expect(deriveEvents(item({ visibility: "anonymous" }), dateAgo)[0]?.actor).toBe("Anônimo"));
  test("every derived history starts the clock with the digest", () =>
    expect(
      deriveEvents(base, dateAgo)
        .map((e) => e.kind)
        .slice(0, 2),
    ).toEqual(["created", "sent_to_authority"]));
});
