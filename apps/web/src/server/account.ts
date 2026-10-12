import { maskedPhone } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { ProfileSchema } from "@/features/auth/profile-schema";
import { auth } from "./auth";
import { peekDevCode } from "./otp-outbox";

const session = () => auth.api.getSession({ headers: getRequestHeaders() });

/** The signed-in person as the app sees them. The phone is only ever returned masked. */
export const getAccount = createServerFn({ method: "GET" }).handler(async () => {
  const s = await session();
  if (!s) return null;
  const u = s.user;
  return {
    id: u.id,
    nick: u.nick ?? null,
    neighborhood: u.neighborhood ?? null,
    guest: Boolean(u.isAnonymous),
    phone: u.phoneNumber ? maskedPhone(u.phoneNumber) : null,
    phoneVerified: Boolean(u.phoneNumberVerified),
    identityVerified: Boolean(u.identityVerified),
  };
});
export type Account = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

type SaveResult = { ok: true } | { ok: false; error: string };

/** Sets the public apelido and bairro. Apelidos are unique. */
export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator(ProfileSchema)
  .handler(async ({ data }): Promise<SaveResult> => {
    const s = await session();
    if (!s || s.user.isAnonymous) throw new Error("Entre com seu telefone para escolher um apelido.");
    const ctx = await auth.$context;
    const taken = await ctx.adapter.findOne<{ id: string }>({
      model: "user",
      where: [{ field: "nick", value: data.nick }],
    });
    if (taken && taken.id !== s.user.id) return { ok: false, error: "Esse apelido já tem dono. Tente outro." };
    await ctx.internalAdapter.updateUser(s.user.id, {
      nick: data.nick,
      name: data.nick,
      neighborhood: data.neighborhood,
    });
    return { ok: true };
  });

/** Development only: the code that would have gone to WhatsApp. Returns null in production. */
export const getDevCode = createServerFn({ method: "POST" })
  .inputValidator(z.string().regex(/^\+55\d{10,11}$/))
  .handler(async ({ data }) => peekDevCode(data));
