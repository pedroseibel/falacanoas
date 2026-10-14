import { expect, test } from "bun:test";
import { formatAddress, lookupAddress } from "./address";

const point: [number, number] = [-51.1839, -29.9177];
const near = (dLat: number, address: Record<string, string>) => ({
  lat: String(point[1] + dLat),
  lon: String(point[0]),
  address,
});

test("street and number when the address found is close to the point", () => {
  expect(formatAddress(near(0.0001, { road: "Rua Tiradentes", house_number: "123" }), point)).toBe(
    "Rua Tiradentes, 123",
  );
  expect(formatAddress(near(0, { road: "Rua Tiradentes", house_number: "120;122" }), point)).toBe(
    "Rua Tiradentes, 120",
  );
});

test("only the street when the number is farther than 40 m, nothing past 150 m", () => {
  // 0.0005° of latitude is about 55 m.
  expect(formatAddress(near(0.0005, { road: "Rua Tiradentes", house_number: "123" }), point)).toBe("Rua Tiradentes");
  expect(formatAddress(near(0.002, { road: "Rua Tiradentes" }), point)).toBeNull();
});

test("squares and footways count as streets; no name, no address", () => {
  expect(formatAddress(near(0, { square: "Praça da Bandeira" }), point)).toBe("Praça da Bandeira");
  expect(formatAddress(near(0, { suburb: "Centro" }), point)).toBeNull();
  expect(formatAddress({ error: "Unable to geocode" }, point)).toBeNull();
  expect(formatAddress(null, point)).toBeNull();
});

test("one request, identified, in Portuguese, with only the point", async () => {
  const seen: Request[] = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    seen.push(new Request(input, init));
    return Response.json(near(0, { road: "Avenida Getúlio Vargas", house_number: "5000" }));
  };
  expect(await lookupAddress(point, Object.assign(fetcher, { preconnect: () => {} }))).toBe(
    "Avenida Getúlio Vargas, 5000",
  );
  const url = new URL(seen[0]?.url ?? "");
  expect(url.pathname).toBe("/reverse");
  expect(url.searchParams.get("lat")).toBe("-29.9177");
  expect(url.searchParams.get("accept-language")).toBe("pt-BR");
  expect(seen[0]?.headers.get("user-agent")).toContain("falacanoas.com.br");
  expect(seen).toHaveLength(1);
});
