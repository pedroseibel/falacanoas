import { DATA_REQUEST_DAYS, followLabel, FollowPlaceSchema } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import {
  dataRequests,
  follows,
  itemAuthors,
  itemConfirmations,
  itemFollows,
  items,
  itemVotes,
  passkeys,
  posts,
  sessions,
  threads,
  users,
} from "./db/schema";

/**
 * Everything the app holds about one account, for "Baixar meus dados" (LGPD art. 18, II and V).
 * Plain server helpers: only lifecycle.ts's server functions import this module.
 *
 * The phone is in the vault, sealed; the app has only its masked hint. The access evidence (IP, port,
 * time) is in the vault too, apart from the account, and goes out on a request through the channel.
 */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function collectMyData(accountId: string, now = new Date()) {
  const [user] = await db.select().from(users).where(eq(users.id, accountId));
  if (!user) return null;
  const [authored, confirmed, voted, followed, places, replies, keys, logins, requests] = await Promise.all([
    db
      .select({
        id: items.id,
        title: items.title,
        category: items.category,
        visibility: items.visibility,
        moderation: items.moderation,
        createdAt: items.createdAt,
        closedAt: items.closedAt,
      })
      .from(itemAuthors)
      .innerJoin(items, eq(items.id, itemAuthors.itemId))
      .where(eq(itemAuthors.accountId, accountId))
      .orderBy(desc(items.createdAt)),
    db
      .select({ item: itemConfirmations.itemId, at: itemConfirmations.createdAt })
      .from(itemConfirmations)
      .where(eq(itemConfirmations.accountId, accountId)),
    db
      .select({ item: itemVotes.itemId, kind: itemVotes.kind, at: itemVotes.at })
      .from(itemVotes)
      .where(eq(itemVotes.accountId, accountId)),
    db
      .select({ item: itemFollows.itemId, at: itemFollows.createdAt })
      .from(itemFollows)
      .where(eq(itemFollows.accountId, accountId)),
    db.select({ place: follows.place, at: follows.createdAt }).from(follows).where(eq(follows.accountId, accountId)),
    db
      .select({
        topic: threads.title,
        item: threads.itemId,
        text: posts.text,
        hidden: posts.hidden,
        at: posts.createdAt,
      })
      .from(posts)
      .innerJoin(threads, eq(threads.id, posts.threadId))
      .where(eq(posts.accountId, accountId))
      .orderBy(desc(posts.createdAt)),
    db
      .select({ createdAt: passkeys.createdAt, deviceType: passkeys.deviceType, backedUp: passkeys.backedUp })
      .from(passkeys)
      .where(eq(passkeys.userId, accountId)),
    db
      .select({
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        ip: sessions.ipAddress,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, accountId)),
    db
      .select({
        protocol: dataRequests.protocol,
        kind: dataRequests.kind,
        status: dataRequests.status,
        at: dataRequests.createdAt,
      })
      .from(dataRequests)
      .where(eq(dataRequests.accountId, accountId)),
  ]);

  return {
    sobre: `Seus dados no ${canoas.branding.name}, como estavam em ${now.toISOString()}. Pedidos sobre eles: /privacidade/pedido (resposta em até ${DATA_REQUEST_DAYS} dias).`,
    conta: {
      id: user.id,
      apelido: user.nick,
      bairro: canoas.neighborhoods.find((n) => n.slug === user.neighborhood)?.name ?? null,
      criadaEm: iso(user.createdAt),
      celular: user.phoneHint,
      celularConfirmadoEm: iso(user.phoneVerifiedAt),
      declarouMaioridadeEm: iso(user.ageConfirmedAt),
      avisoDePrivacidade: { versao: user.privacyNoticeVersion, lidoEm: iso(user.privacyNoticeReadAt) },
    },
    registros: authored.map((r) => ({
      codigo: r.id,
      titulo: r.title,
      categoria: canoas.categories.find((c) => c.key === r.category)?.label ?? r.category,
      emPublico: r.visibility === "anonymous" ? "Anônimo em público" : "com o apelido",
      moderacao: r.moderation,
      criadoEm: iso(r.createdAt),
      fechadoEm: iso(r.closedAt),
    })),
    confirmacoes: confirmed.map((c) => ({ registro: c.item, em: iso(c.at) })),
    votos: voted.map((v) => ({
      registro: v.item,
      voto: v.kind === "still" ? "continua acontecendo" : "foi resolvido",
      em: iso(v.at),
    })),
    acompanhando: {
      registros: followed.map((f) => ({ registro: f.item, desde: iso(f.at) })),
      lugares: places.flatMap((p) => {
        const place = FollowPlaceSchema.safeParse(p.place);
        if (!place.success) return [];
        const { title, detail } = followLabel(place.data, canoas);
        return [{ lugar: detail ? `${title} · ${detail}` : title, dados: place.data, desde: iso(p.at) }];
      }),
    },
    conversas: replies.map((r) => ({
      topico: r.topic,
      registro: r.item,
      texto: r.text,
      ocultadaPelaModeracao: r.hidden,
      em: iso(r.at),
    })),
    passkeys: keys.map((k) => ({
      criadaEm: iso(k.createdAt),
      tipo: k.deviceType,
      sincronizada: k.backedUp,
    })),
    sessoesAbertas: logins.map((s) => ({
      desde: iso(s.createdAt),
      ate: iso(s.expiresAt),
      ip: s.ip,
      navegador: s.userAgent,
    })),
    pedidosDeDados: requests.map((r) => ({
      protocolo: r.protocol,
      pedido: r.kind,
      situacao: r.status === "open" ? "aberto" : "respondido",
      em: iso(r.at),
    })),
    registrosDeAcesso:
      "Endereço IP, porta, data e hora de cada entrada e de cada registro, confirmação ou comentário ficam no cofre, separados da conta, por 6 meses. Para recebê-los, faça um pedido pelo canal de dados.",
  };
}

export type MyData = NonNullable<Awaited<ReturnType<typeof collectMyData>>>;
