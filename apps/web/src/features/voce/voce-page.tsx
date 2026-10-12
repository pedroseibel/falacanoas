import type { Item, Municipality, Viewer } from "@fala/core";
import { Bell, Check, Home, Map as MapIcon, Plus, Route as RouteIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ItemCard } from "@/features/map/item-card";
import { ThemeSchema, setTheme, useTheme, type Theme } from "./theme";

const FOLLOW_ICON = { home: Home, route: RouteIcon, neighborhood: MapIcon, item: Bell };
const THEME_LABEL: Record<Theme, string> = { auto: "Sistema", light: "Claro", dark: "Escuro" };
const LEVELS: { level: number; flag: "phoneVerified" | "identityVerified"; label: string; detail: string }[] = [
  { level: 1, flag: "phoneVerified", label: "Telefone confirmado", detail: "Pode registrar problemas" },
  {
    level: 2,
    flag: "identityVerified",
    label: "Identidade verificada",
    detail: "Pode confirmar consertos e conversar no bairro",
  },
];
const initials = (nick: string) =>
  nick
    .split(/[-\s]+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export function VocePage({
  viewer,
  muni,
  items,
  onOpen,
}: {
  viewer: Viewer;
  muni: Municipality;
  items: Item[];
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const mine = items.filter((i) => i.author === viewer.nick && i.visibility === "pseudonymous").slice(0, 6);
  const bairro = muni.neighborhoods.find((n) => n.slug === viewer.neighborhood)?.name ?? "";
  return (
    <div className="mx-auto grid max-w-295 gap-5 px-7 pt-8 pb-16 max-[900px]:px-4 max-[900px]:pt-5 max-[900px]:pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Você</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Seu apelido aparece nos registros. Seu telefone e sua identidade, nunca.
        </p>
      </header>
      <div className="grid grid-cols-12 items-start gap-5 max-[1100px]:grid-cols-1">
        <div className="col-span-5 grid gap-5 max-[1100px]:col-span-1">
          <section className="grid gap-4 rounded-2xl border border-hairline bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3.5">
              <span className="grid size-14 place-items-center rounded-full bg-panel-3 text-lg font-semibold uppercase">
                {initials(viewer.nick)}
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{viewer.nick}</h2>
                <p className="text-sm text-muted-foreground">{bairro}</p>
              </div>
            </div>
            <ul className="grid border-t border-hairline">
              {LEVELS.map((l) => (
                <li key={l.level} className="flex items-center gap-2.5 border-b border-hairline py-3 text-sm">
                  {viewer[l.flag] ? <Check className="size-4" /> : <span className="size-4" />}
                  <span className="flex-1">
                    {l.label}
                    <small className="block text-xs text-muted-foreground">{l.detail}</small>
                  </span>
                  {viewer[l.flag] ? (
                    <Badge variant="outline">nível {l.level}</Badge>
                  ) : (
                    <Button size="sm" variant="outline">
                      Verificar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
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
                if (!parsed.success) return;
                setTheme(parsed.data);
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
        <div className="col-span-7 grid gap-5 max-[1100px]:col-span-1">
          <section
            className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft"
            aria-labelledby="ac-t"
          >
            <h2 id="ac-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
              Acompanhando <span className="font-normal text-muted-foreground">avisos no celular</span>
            </h2>
            <ul>
              {viewer.following.map((f) => {
                const FollowIcon = FOLLOW_ICON[f.type];
                return (
                  <li
                    key={`${f.type}|${f.label}`}
                    className="flex items-center gap-3 border-t border-hairline px-4 py-3 first:border-t-0"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-muted text-ink-2">
                      <FollowIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-semibold">{f.label}</b>
                      <small className="text-xs text-muted-foreground">{f.detail}</small>
                    </span>
                    <Switch defaultChecked aria-label={`Avisos: ${f.label}`} />
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-hairline px-4 py-3">
              <Button variant="outline" size="sm">
                <Plus data-icon="inline-start" />
                Acompanhar um lugar ou trajeto
              </Button>
            </div>
          </section>
          <section
            className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft"
            aria-labelledby="mr-t"
          >
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            Protótipo: registros, apelidos, respostas e números são fictícios. Fotos: Nilce Bravo (CC BY-SA 3.0),
            Yeuxpapilon (CC BY-SA 4.0), Myke Sena/DPU (CC0), via Wikimedia Commons. Mapa: OpenFreeMap, © OpenMapTiles, ©
            colaboradores do OpenStreetMap. Bairros: IBGE, Censo 2022.
          </p>
        </div>
      </div>
    </div>
  );
}
