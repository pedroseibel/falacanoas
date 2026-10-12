import type { Municipality } from "@fala/core";
import { useStore } from "@tanstack/react-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { About, Rules } from "./about";
import { Bairros } from "./bairros";
import { Wrap } from "./bits";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { HowItWorks } from "./how";
import { Join, useJoinForm, type Channel } from "./join";
import { queueState } from "./landing-model";
import { stuckOnScroll } from "./motion";
import { BleedPhoto, Numbers } from "./numbers";
import { Scoreboard } from "./scoreboard";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#placar", label: "Placar" },
  { href: "#quem-faz", label: "Quem faz" },
  { href: "#bairros", label: "Bairros" },
];

function Header() {
  return (
    <header
      id="top"
      ref={stuckOnScroll}
      className="sticky top-0 z-20 border-b border-transparent bg-background/94 transition-colors duration-300 ease-fluid data-stuck:border-hairline"
    >
      <Wrap className="flex h-17 items-center gap-7">
        <a href="#conteudo" aria-label="Fala, Canoas: início" className="inline-flex items-center gap-3 no-underline">
          <span className="text-wordmark font-semibold whitespace-nowrap">
            Fala<span className="text-signal">,</span> Canoas
          </span>
          <Badge variant="chip" className="max-narrow:hidden">
            independente
          </Badge>
        </a>
        <nav aria-label="Seções" className="ml-auto flex gap-6.5 text-ui text-ink-2 max-phone:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="py-1.5 hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <Button
          variant="outline"
          size="lg"
          className="ml-1 max-phone:ml-auto"
          nativeButton={false}
          render={<a href="#entrar" />}
        >
          Entrar na fila
        </Button>
      </Wrap>
    </header>
  );
}

/**
 * The public landing page. The chosen bairro is shared by the hero, the map, the list and the
 * sign-up form; it lives in the form and is mirrored to ?b= so a shared link opens on the bairro.
 */
export function LandingPage({
  muni,
  confirmed,
  live,
  initial,
  onBairroInUrl,
}: {
  muni: Municipality;
  confirmed: Record<string, number>;
  live: boolean;
  initial: { neighborhood: string; channel: Channel };
  onBairroInUrl: (slug: string) => void;
}) {
  const join = useJoinForm(initial);
  const { form } = join;
  const bairro = useStore(form.store, (s) => s.values.neighborhood);
  const queue = queueState(
    muni.neighborhoods.find((n) => n.slug === bairro),
    confirmed,
  );

  const pick = (slug: string) => {
    form.setFieldValue("neighborhood", slug);
    onBairroInUrl(slug);
  };
  const setChannel = (channel: Channel) => {
    if (form.getFieldValue("channel") === channel) return;
    form.setFieldValue("channel", channel);
    form.setFieldValue("contact", "");
  };
  const goJoin = (channel: Channel) => {
    setChannel(channel);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("entrar")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    setTimeout(
      () => document.getElementById(bairro ? "f-contato" : "f-bairro")?.focus({ preventScroll: true }),
      reduced ? 0 : 650,
    );
  };

  return (
    <div data-landing className="text-body text-foreground antialiased">
      <a
        href="#conteudo"
        className="absolute -top-15 left-gutter z-50 rounded-lg bg-foreground px-3.5 py-2.5 font-semibold text-background no-underline focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero muni={muni} bairro={bairro} queue={queue} onPick={pick} onJoin={goJoin} />
        <HowItWorks muni={muni} />
        <Scoreboard muni={muni} confirmed={confirmed} />
        <BleedPhoto />
        <Numbers />
        <Rules />
        <About />
        <Bairros muni={muni} confirmed={confirmed} live={live} selected={bairro} onPick={pick} />
        <Join muni={muni} confirmed={confirmed} queue={queue} join={join} onPick={pick} onChannel={setChannel} />
      </main>
      <LandingFooter />
    </div>
  );
}
