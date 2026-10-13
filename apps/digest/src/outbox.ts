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

export function fileOutbox(dir: string): Outbox {
  return {
    name: "arquivo",
    async send(mail: Mail) {
      await mkdir(dir, { recursive: true });
      const id = `${new Date().toISOString().replaceAll(":", "-")}-${crypto.randomUUID().slice(0, 8)}`;
      const eml = [
        `From: ${encodeAddress(mail.from)}`,
        `To: ${mail.to.map(encodeAddress).join(", ")}`,
        ...(mail.cc.length ? [`Cc: ${mail.cc.map(encodeAddress).join(", ")}`] : []),
        `Subject: ${encodeHeader(mail.subject)}`,
        `Message-ID: <${id}@resumo.invalid>`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        mail.text,
      ].join("\n");
      await writeFile(`${dir}/${id}.eml`, eml);
      return `${id}@resumo.invalid`;
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
