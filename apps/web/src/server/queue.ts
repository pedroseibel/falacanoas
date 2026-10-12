import { QueueSignupSchema, confirmationCode } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";

/**
 * The landing page queue. Until the database is connected nothing is stored: counts are zero and
 * a sign-up is validated, given a confirmation code and reported back as not saved (the page says so).
 */
export const getQueue = createServerFn({ method: "GET" }).handler(async () => {
  const confirmed: Record<string, number> = {};
  return { confirmed, live: false };
});

export const joinQueue = createServerFn({ method: "POST" })
  .inputValidator(QueueSignupSchema)
  .handler(async ({ data }) => {
    if (!canoas.neighborhoods.some((n) => n.slug === data.neighborhood)) throw new Error("Bairro desconhecido.");
    return {
      code: confirmationCode(crypto.getRandomValues(new Uint32Array(4))),
      saved: false,
      /** The project's WhatsApp number (digits with country code), once there is one. */
      whatsappNumber: null,
    };
  });
