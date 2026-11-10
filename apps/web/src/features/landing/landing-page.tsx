import { prefersReducedMotion } from "@/lib/reduced-motion";
import { Wordmark } from "@/components/wordmark";
import type { Municipality } from "@fala/core";
import { useStore } from "@tanstack/react-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { About } from "./about";
import { Wrap } from "./bits";
import { Faq } from "./faq";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { HowItWorks } from "./how";
import { Join, useJoinForm, type Channel } from "./join";
import { queueState } from "./landing-model";
import { stuckOnScroll } from "./motion";
import { Scoreboard } from "./scoreboard";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#placar", label: "Placar" },
  { href: "#quem-faz", label: "Quem faz" },
  { href: "#perguntas", label: "Perguntas" },
];

function Header() {
  return (
    <header
      id="top"
      ref={stuckOnScroll}
      className="sticky top-0 z-20 border-b border-transparent bg-background/94 transition-colors duration-300 ease-fluid data-stuck:border-hairline"
    >
      <Wrap className="flex h-16 items-center gap-7">
        <a href="#conteudo" aria-label="Fala, Canoas: início" className="inline-flex items-center gap-3 no-underline">
          <span className="text-wordmark font-semibold whitespace-nowrap">
            <Wordmark />
          </span>
          <Badge variant="chip" className="max-narrow:hidden">
            independente
          </Badge>
        </a>
        <nav aria-label="Seções" className="ml-auto flex gap-6.5 text-ui text-ink-2 max-phone:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="py-1.5 transition-colors duration-200 hover:text-foreground">
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
 * The public landing page: a product page for a public instrument. The time clock performs a pin's
 * life in the first viewport; the chosen bairro is shared by the hero, the map and the sign-up form
 * (it lives in the form and is mirrored to ?b= so a shared link opens on the bairro).
 */
export function LandingPage({
  muni,
  confirmed,
  initial,
  onBairroInUrl,
}: {
  muni: Municipality;
  confirmed: Record<string, number>;
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
    const reduced = prefersReducedMotion();
    document.getElementById("entrar")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    setTimeout(
      () => document.getElementById(bairro ? "f-contato" : "f-bairro")?.focus({ preventScroll: true }),
      reduced ? 0 : 650,
    );
  };

  return (
    <div data-landing className="text-body text-foreground">
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
        <About />
        <Faq muni={muni} />
        <Join muni={muni} confirmed={confirmed} queue={queue} join={join} onPick={pick} onChannel={setChannel} />
      </main>
      <LandingFooter muni={muni} />
    </div>
  );
}
