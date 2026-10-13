import { expect, test } from "bun:test";
import { sitePhotos } from "./photos";

test("only the site's own photo addresses are fetched, from the configured base", async () => {
  const asked: string[] = [];
  const fetcher = async (input: string | URL) => {
    asked.push(String(input));
    return new Response(new Uint8Array([1, 2, 3]));
  };
  const photos = sitePhotos("https://falacanoas.com.br", "http://127.0.0.1:3100", fetcher);
  expect(await photos("https://falacanoas.com.br/api/fotos/a.webp")).toEqual(new Uint8Array([1, 2, 3]));
  expect(await photos("https://elsewhere.example/a.webp")).toBeNull();
  expect(asked).toEqual(["http://127.0.0.1:3100/api/fotos/a.webp"]);
});
