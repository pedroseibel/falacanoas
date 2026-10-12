import { initials, type Item, type Municipality } from "@fala/core";
import { Check, LogOut, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ItemCard } from "@/features/map/item-card";
import type { Account } from "@/server/account";
import { ThemeSchema, setTheme, useTheme, type Theme } from "./theme";

const THEME_LABEL: Record<Theme, string> = { auto: "Sistema", light: "Claro", dark: "Escuro" };
const panel = "overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft";

function Levels({ account }: { account: Account }) {
  const rows = [
    {
      level: 1,
      done: account.phoneVerified,
      label: "Telefone confirmado",
      detail: account.phone ? `${account.phone} · pode registrar problemas` : "Pode registrar problemas",
    },
    {
      level: 2,
      done: account.identityVerified,
      label: "Identidade verificada",
      detail: "Pode confirmar consertos e conversar no bairro",
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
}: {
  account: Account | null;
  muni: Municipality;
  items: Item[];
  onOpen: (id: string) => void;
  onSignIn: () => void;
  onPickNick: () => void;
  onSignOut: () => void;
}) {
  const theme = useTheme();
  const nick = account?.nick ?? null;
  const bairro = muni.neighborhoods.find((n) => n.slug === account?.neighborhood)?.name ?? null;
  const mine = nick ? items.filter((i) => i.author === nick && i.visibility === "pseudonymous").slice(0, 6) : [];
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
              <Levels account={account} />
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
        </div>
        <div className="col-span-7 grid gap-5 max-split:col-span-1">
          {account && !account.guest && (
            <>
              <section className={panel} aria-labelledby="ac-t">
                <h2 id="ac-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
                  Acompanhando <span className="font-normal text-muted-foreground">avisos no celular</span>
                </h2>
                <div className="grid justify-items-start gap-3 px-4 py-4">
                  <p className="text-sm text-ink-2">
                    Você ainda não acompanha nenhum lugar. Sua casa, um trajeto, o bairro ou um registro: quando algo
                    mudar, você recebe um aviso.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    <Plus data-icon="inline-start" />
                    Acompanhar um lugar ou trajeto
                    <Badge variant="chip">em breve</Badge>
                  </Button>
                </div>
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
            Protótipo: registros, apelidos, respostas e números do mapa são fictícios. Contas ficam só na memória do
            servidor até o banco de dados entrar. Fotos: Nilce Bravo (CC BY-SA 3.0), Yeuxpapilon (CC BY-SA 4.0), Myke
            Sena/DPU (CC0), via Wikimedia Commons. Mapa: OpenFreeMap, © OpenMapTiles, © colaboradores do OpenStreetMap.
            Bairros: IBGE, Censo 2022.
          </p>
        </div>
      </div>
    </div>
  );
}
