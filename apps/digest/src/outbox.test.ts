import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeHeader, fileOutbox, noOutbox } from "./outbox";

const mail = {
  from: "Fala, Canoas <r@x.invalid>",
  to: ["a@x.invalid"],
  cc: [],
  subject: "Resumo",
  text: "Olá, “mundo”\n",
};

test("the development outbox writes an .eml with the headers and the text", async () => {
  const dir = await mkdtemp(join(tmpdir(), "resumo-"));
  try {
    const id = await fileOutbox(dir).send(mail);
    const [file] = await readdir(dir);
    expect(file?.endsWith(".eml")).toBeTrue();
    const eml = await readFile(join(dir, file ?? ""), "utf8");
    expect(eml).toContain("To: a@x.invalid\n");
    expect(eml).toContain("From: Fala, Canoas <r@x.invalid>\n");
    expect(eml).not.toContain("Cc:");
    expect(eml).toContain(`Message-ID: <${id}>`);
    expect(eml.endsWith("\n\nOlá, “mundo”\n")).toBeTrue();
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("without a sender, production refuses rather than pretend", async () => {
  await expect(noOutbox.send(mail)).rejects.toThrow(/remetente/);
});

test("headers with accents become UTF-8 encoded words; plain ones stay as they are", () => {
  expect(encodeHeader("Resumo")).toBe("Resumo");
  const encoded = encodeHeader("Fala, Canoas · resumo de 12 out");
  expect(encoded).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
  expect(Buffer.from(encoded.slice(10, -2), "base64").toString()).toBe("Fala, Canoas · resumo de 12 out");
});
