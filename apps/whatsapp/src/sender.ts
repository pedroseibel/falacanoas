import { maskedPhone } from "@fala/core";
import { appendFile, mkdir } from "node:fs/promises";
import type { Sender } from "./conversation";

/**
 * Where replies go. No WhatsApp provider is connected yet (BUILD 3.2, founder input): development
 * appends each reply to outbox/mensagens.txt; production has no sender, so replies fail (and are
 * logged) while confirmations still count.
 */

export function fileSender(dir: string): Sender {
  return {
    name: "arquivo",
    async send(to, text) {
      await mkdir(dir, { recursive: true });
      await appendFile(`${dir}/mensagens.txt`, `--- ${new Date().toISOString()} para +${to}\n${text}\n\n`);
      console.info(`[dev] resposta para ${maskedPhone(`+${to}`)}`);
    },
  };
}

export const noSender: Sender = {
  name: "nenhum",
  async send() {
    throw new Error("Nenhum provedor de WhatsApp configurado (BUILD 3.2).");
  },
};
