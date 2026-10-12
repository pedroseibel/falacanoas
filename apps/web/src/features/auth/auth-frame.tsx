import { ArrowLeft } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/** The way out of the sign-in pages: a real link, navigated by the route adapter. */
export interface BackLink {
  href: string;
  onNavigate: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * The sign-in pages stand alone (no app header, search or tab bar): the wordmark, one way back,
 * a single column in the upper third, and the independence facts at the foot.
 */
export function AuthFrame({ back, children }: { back: BackLink; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-wrap items-center justify-between gap-4 px-gutter">
          <span className="inline-flex items-center gap-2.5">
            <span className="text-wordmark font-semibold whitespace-nowrap">
              Fala<span className="text-signal">,</span> Canoas
            </span>
            <Badge variant="outline">protótipo</Badge>
          </span>
          <a
            href={back.href}
            onClick={back.onNavigate}
            className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-ui text-ink-2 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar
          </a>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-gutter pt-head pb-section-sm max-compact:pt-8">
        <div className="grid w-full max-w-auth content-start gap-8">{children}</div>
      </main>
      <footer className="pb-safe border-t border-hairline">
        <p className="mx-auto flex w-full max-w-wrap flex-wrap justify-between gap-x-6 gap-y-1 px-gutter py-4 text-caption text-muted-foreground max-compact:justify-center max-compact:text-center">
          <span>Fala, Canoas é independente. Não é um canal da Prefeitura.</span>
          <span>Código aberto (AGPL-3.0). Para maiores de 18 anos.</span>
        </p>
      </footer>
    </div>
  );
}

/** The page's heading and the one line under it. */
export function AuthHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-heading font-semibold text-balance">{title}</h1>
      <p className="text-ui text-pretty text-ink-2">{children}</p>
    </div>
  );
}
