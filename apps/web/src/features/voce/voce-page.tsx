import { bairroName, countsFrom, initials, type Item, localStampInText, type Municipality } from "@fala/core";
import { useQuery } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { Check, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { textLink } from "@/components/text-link";
import { ItemCard } from "@/components/item-card";
import { VolunteerCard } from "./volunteer-card";
import { isModeratorQuery } from "@/features/moderation/queries";
import { followingQuery } from "@/features/voce/queries";
import { SanctionNotices } from "./sanction-notice";
import { useNow } from "@/lib/use-now";
import type { Account } from "@/server/account";
import { Following } from "./following";
import { ChangeNumber } from "./change-number";
import { CloseAccount } from "./close-account";
import { DownloadData } from "./download-data";
import { Passkeys } from "./passkeys";
import { ThemeSchema, setTheme, useTheme, type Theme } from "@/lib/theme";

const THEME_LABEL: Record<Theme, string> = { auto: "Sistema", light: "Claro", dark: "Escuro" };
const panel = "overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft";

/** When this account's confirmations start counting (round 18, Q17), or null if they already do. */
function confirmationsFrom(account: Account, now: number, timezone: string): string | null {
  if (!account.phoneVerifiedAt || now === 0) return null;
  const from = countsFrom(new Date(account.phoneVerifiedAt));
  return from.getTime() > now ? localStampInText(from, timezone) : null;
}

function Levels({ account, timezone }: { account: Account; timezone: string }) {
  const from = confirmationsFrom(account, useNow(60_000), timezone);
  const rows = [
    {
      level: 1,
      done: account.phoneVerified,
      label: "Celular confirmado",
      detail: [account.phone, "registra, confirma e comenta", from && `suas confirmações contam a partir de ${from}`]
        .filter(Boolean)
        .join(" · "),
    },
    {
      level: 2,
      done: account.identityVerified,
      label: "Identidade verificada",
      detail: "Opcional e ainda não disponível.",
    },
  ];
  return (
    <ul className="grid border-t border-hairline">
      {rows.map((r) => (
        <li key={r.level} className="flex items-center gap-2.5 border-b border-hairline py-3 text-sm">
          {r.done ? <Check className="size-4" aria-hidden="true" /> : <span className="size-4" />}
          <span className="flex-1">
            {r.label}
            <small className="block text-xs text-muted-foreground">{r.detail}</small>
          </span>
          <Badge variant="outline">{r.done ? `nível ${r.level}` : "em breve"}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function VocePage({
  account,
  muni,
  items,
  onOpen,
  onSignIn,
  onPickNick,
  onSignOut,
  onModerate,
  onClosed,
  onNumberChanged,
  requestPath,
  onRequest,
}: {
  account: Account | null;
  muni: Municipality;
  items: Item[];
  onOpen: (id: string) => void;
  onSignIn: () => void;
  onPickNick: () => void;
  onSignOut: () => void;
  onModerate: () => void;
  /** The account was closed: signed out everywhere. */
  onClosed: () => void;
  /** The number changed: the account shows the new hint; other sessions ended. */
  onNumberChanged: (hint: string) => void;
  /** The data-subject channel: a real link, which a plain click follows inside the app. */
  requestPath: string;
  onRequest: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const theme = useTheme();
  const nick = account?.nick ?? null;
  const bairro = bairroName(muni, account?.neighborhood);
  // From the server, by authorship: "Anônimo em público" reports included, since only their owner sees this.
  const { data: following } = useQuery({ ...followingQuery, enabled: Boolean(account && !account.guest) });
  const mine = following?.mine ?? [];
  const { data: moderator } = useQuery({ ...isModeratorQuery, enabled: Boolean(account && !account.guest) });
  return (
    <div className="mx-auto grid max-w-295 gap-5 px-7 pt-8 pb-16 max-phone:px-4 max-phone:pt-5 max-phone:pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Você</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Seu apelido aparece nos registros. Seu telefone e sua identidade, nunca.
        </p>
      </header>
      <div className="grid grid-cols-12 items-start gap-5 max-split:grid-cols-1">
        <div className="col-span-5 grid gap-5 max-split:col-span-1">
          {account && !account.guest && <SanctionNotices timezone={muni.timezone} />}
          {account && !account.guest ? (
            <section
              className="grid gap-4 rounded-2xl border border-hairline bg-card p-5 shadow-soft"
              aria-label="Sua conta"
            >
              <div className="flex items-center gap-3.5">
                <span className="grid size-14 place-items-center rounded-full bg-panel-3 text-lg font-semibold">
                  {nick ? initials(nick) : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold tracking-tight">{nick ?? "Sem apelido ainda"}</h2>
                  <p className="text-sm text-muted-foreground">{bairro ?? "Bairro não escolhido"}</p>
                </div>
                {!nick && (
                  <Button size="sm" variant="outline" onClick={onPickNick}>
                    Escolher
                  </Button>
                )}
              </div>
              <Levels account={account} timezone={muni.timezone} />
              <Passkeys nick={nick} timezone={muni.timezone} />
              {account.phoneVerified && (
                <section aria-labelledby="cel-t" className="grid gap-2.5">
                  <h3 id="cel-t" className="text-sm font-semibold">
                    Celular
                  </h3>
                  <p className="text-sm text-pretty text-ink-2">
                    Vai trocar de número? Troque aqui enquanto o antigo ainda recebe mensagens, ou com a sua passkey.
                  </p>
                  <ChangeNumber hint={account.phone} onChanged={onNumberChanged} />
                </section>
              )}
              <Button variant="ghost" size="sm" className="justify-self-start" onClick={onSignOut}>
                <LogOut data-icon="inline-start" />
                Sair
              </Button>
            </section>
          ) : (
            <section
              className="grid gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-soft"
              aria-label="Entrar"
            >
              <h2 className="text-xl font-semibold tracking-tight">Entre para registrar e acompanhar</h2>
              <p className="text-sm text-ink-2">
                Com o seu celular: mandamos um código pelo WhatsApp. Em público, você aparece só com um apelido e o seu
                bairro.
              </p>
              <Button variant="signal" className="justify-self-start" onClick={onSignIn}>
                Entrar com o celular
              </Button>
            </section>
          )}
          {account && !account.guest && account.phoneVerified && account.nick && !moderator && (
            <VolunteerCard muni={muni} home={account.neighborhood ?? null} />
          )}
          {moderator && (
            <section
              className="grid gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-soft"
              aria-labelledby="mod-t"
            >
              <h2 id="mod-t" className="text-sm font-semibold">
                Moderação
              </h2>
              <p className="text-sm text-ink-2">
                A fila tem denúncias, fotos novas, registros segurados, contestações e sanções.
              </p>
              <Button variant="outline" className="justify-self-start" onClick={onModerate}>
                Abrir a fila
              </Button>
            </section>
          )}
          <section
            className="grid gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-soft"
            aria-labelledby="ap-t"
          >
            <h2 id="ap-t" className="text-sm font-semibold">
              Aparência
            </h2>
            <ToggleGroup
              variant="outline"
              value={[theme]}
              onValueChange={(v) => {
                const parsed = ThemeSchema.safeParse(v[0]);
                if (parsed.success) setTheme(parsed.data);
              }}
            >
              {ThemeSchema.options.map((t) => (
                <ToggleGroupItem key={t} value={t}>
                  {THEME_LABEL[t]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
          {account && !account.guest && account.phoneVerified && (
            <section
              className="grid gap-3 rounded-2xl border border-hairline bg-card p-5 shadow-soft"
              aria-labelledby="dados-t"
            >
              <h2 id="dados-t" className="text-sm font-semibold">
                Seus dados
              </h2>
              <p className="text-sm text-pretty text-ink-2">
                Uma cópia de tudo o que a sua conta guarda. Para o resto, como os registros de acesso, uma correção ou
                um conteúdo em que você aparece,{" "}
                <a href={requestPath} onClick={onRequest} className={textLink}>
                  faça um pedido
                </a>
                .
              </p>
              <DownloadData timezone={muni.timezone} />
              <div className="mt-2 grid gap-3 border-t border-hairline pt-5">
                <p className="text-sm text-pretty text-ink-2">
                  Você pode encerrar a conta quando quiser. O que publicou continua no mapa, sem ligação com você.
                </p>
                <CloseAccount onClosed={onClosed} />
              </div>
            </section>
          )}
        </div>
        <div className="col-span-7 grid gap-5 max-split:col-span-1">
          {account && !account.guest && (
            <>
              <section className={panel} aria-labelledby="ac-t">
                <h2 id="ac-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
                  Acompanhando
                </h2>
                <Following muni={muni} items={items} home={account.neighborhood} onOpen={onOpen} />
              </section>
              <section className={panel} aria-labelledby="mr-t">
                <h2 id="mr-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
                  Meus registros <span className="font-normal text-muted-foreground">{mine.length}</span>
                </h2>
                <div className="grid gap-0.5 p-1.5">
                  {mine.length ? (
                    mine.map((it) => <ItemCard key={it.id} it={it} muni={muni} selected={false} onOpen={onOpen} />)
                  ) : (
                    <p className="p-6 text-center text-sm text-muted-foreground">Você ainda não registrou nada.</p>
                  )}
                </div>
              </section>
            </>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Protótipo: registros, apelidos, respostas e números marcados como exemplo são fictícios. Contas e registros
            ficam num banco de dados de teste e podem ser apagados. Fotos: Nilce Bravo (CC BY-SA 3.0), Yeuxpapilon (CC
            BY-SA 4.0), Myke Sena/DPU (CC0), via Wikimedia Commons. Mapa: OpenFreeMap, © OpenMapTiles, © colaboradores
            do OpenStreetMap. Bairros: IBGE, Censo 2022.
          </p>
        </div>
      </div>
    </div>
  );
}
