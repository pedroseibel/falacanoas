import { mkdir, writeFile } from "node:fs/promises";
import type { Mail, Outbox } from "./run";

/**
 * Where the digest goes. No e-mail sender is connected yet (BUILD 3.1, founder input): in
 * development each digest is written as an .eml file under outbox/, and the run goes on as if sent;
 * in production there's no outbox, so nothing is sent and no clock starts.
 */

/** RFC 2047: a header with accents ("·", "Canoas, ç") as a UTF-8 encoded word. */
export const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;

/** "Fala, Canoas <resumo@…>": only the display name is encoded. */
const encodeAddress = (address: string) => {
  const m = /^(.*?)\s*<([^>]+)>$/.exec(address);
  return m?.[1] ? `${encodeHeader(m[1])} <${m[2]}>` : address;
};

/** Base64 in 76-character lines (RFC 2045). */
const base64Lines = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64").replace(/.{76}/g, "$&\n");

/** The message as RFC 5322 text: plain when it's only text, multipart/mixed with attachments. */
export function eml(mail: Mail, id: string): string {
  const head = [
    `From: ${encodeAddress(mail.from)}`,
    `To: ${mail.to.map(encodeAddress).join(", ")}`,
    ...(mail.cc.length ? [`Cc: ${mail.cc.map(encodeAddress).join(", ")}`] : []),
    `Subject: ${encodeHeader(mail.subject)}`,
    `Message-ID: <${id}>`,
    "MIME-Version: 1.0",
  ];
  const text = ["Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: 8bit", "", mail.text];
  if (!mail.attachments.length) return [...head, ...text].join("\n");
  const boundary = `resumo-${id.replace(/[^A-Za-z0-9]/g, "")}`;
  return [
    ...head,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    ...text,
    ...mail.attachments.flatMap((a) => [
      `--${boundary}`,
      `Content-Type: ${a.contentType}; name="${a.filename}"`,
      `Content-Disposition: attachment; filename="${a.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(a.content),
    ]),
    `--${boundary}--`,
    "",
  ].join("\n");
}

export function fileOutbox(dir: string): Outbox {
  return {
    name: "arquivo",
    async send(mail: Mail) {
      await mkdir(dir, { recursive: true });
      const stamp = `${new Date().toISOString().replaceAll(":", "-")}-${crypto.randomUUID().slice(0, 8)}`;
      const id = `${stamp}@resumo.invalid`;
      await writeFile(`${dir}/${stamp}.eml`, eml(mail, id));
      // The PDF beside the .eml, to open without a mail client.
      // oxlint-disable-next-line no-await-in-loop
      for (const a of mail.attachments) await writeFile(`${dir}/${stamp}-${a.filename}`, a.content);
      return id;
    },
  };
}

/** Production without a provider: refuses, so no report is marked sent. */
export const noOutbox: Outbox = {
  name: "nenhum",
  async send() {
    throw new Error("Nenhum remetente de e-mail configurado (BUILD 3.1).");
  },
};
