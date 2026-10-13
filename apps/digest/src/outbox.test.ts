import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eml, encodeHeader, fileOutbox, noOutbox } from "./outbox";

const mail = {
  from: "Fala, Canoas <r@x.invalid>",
  to: ["a@x.invalid"],
  cc: [],
  subject: "Resumo",
  text: "Olá, “mundo”\n",
  attachments: [],
};

test("the development outbox writes an .eml with the headers and the text", async () => {
  const dir = await mkdtemp(join(tmpdir(), "resumo-"));
  try {
    const id = await fileOutbox(dir).send(mail);
    const [file] = await readdir(dir);
    expect(file?.endsWith(".eml")).toBeTrue();
    const written = await readFile(join(dir, file ?? ""), "utf8");
    expect(written).toContain("To: a@x.invalid\n");
    expect(written).toContain("From: Fala, Canoas <r@x.invalid>\n");
    expect(written).not.toContain("Cc:");
    expect(written).toContain(`Message-ID: <${id}>`);
    expect(written.endsWith("\n\nOlá, “mundo”\n")).toBeTrue();
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

test("with an attachment: multipart/mixed, the text first, the file in base64 lines, and the file beside the .eml", async () => {
  const pdf = new Uint8Array(200).fill(37);
  const withPdf = { ...mail, attachments: [{ filename: "Resumo.pdf", contentType: "application/pdf", content: pdf }] };
  const text = eml(withPdf, "x@resumo.invalid");
  const boundary = /boundary="([^"]+)"/.exec(text)?.[1] ?? "";
  expect(boundary).not.toBe("");
  const parts = text.split(`--${boundary}`);
  expect(parts[1]).toContain("Content-Type: text/plain; charset=utf-8");
  expect(parts[1]).toContain("Olá, “mundo”");
  expect(parts[2]).toContain('Content-Disposition: attachment; filename="Resumo.pdf"');
  const body = (parts[2] ?? "").split("\n\n")[1] ?? "";
  expect(body.split("\n").every((l) => l.length <= 76)).toBeTrue();
  expect(new Uint8Array(Buffer.from(body.replaceAll("\n", ""), "base64"))).toEqual(pdf);
  expect(text.trimEnd().endsWith(`--${boundary}--`)).toBeTrue();

  const dir = await mkdtemp(join(tmpdir(), "resumo-"));
  try {
    await fileOutbox(dir).send(withPdf);
    const files = await readdir(dir);
    expect(files.some((f) => f.endsWith("-Resumo.pdf"))).toBeTrue();
  } finally {
    await rm(dir, { recursive: true });
  }
});
