import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Go } from "./off-map";

/**
 * A page outside the app's sections (an address that leads nowhere, a failure): the wordmark home,
 * the content in the upper third, the independence facts at the foot. The sign-in pages' frame.
 */
export function StandaloneFrame({ go, children }: { go: Go; children: ReactNode }) {
  const home = go("/");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-wrap items-center gap-2.5 px-gutter">
          <a
            href={home.href}
            onClick={home.onClick}
            className="-mx-1 rounded-md px-1 text-wordmark font-semibold whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Fala<span className="text-signal">,</span> Canoas
          </a>
          <Badge variant="outline">protótipo</Badge>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-gutter pt-head pb-section-sm max-compact:pt-6">
        <div className="w-full max-w-wrap">{children}</div>
      </main>
      <footer className="pb-safe border-t border-hairline">
        <p className="mx-auto flex w-full max-w-wrap flex-wrap justify-between gap-x-6 gap-y-1 px-gutter py-4 text-caption text-muted-foreground max-compact:justify-center max-compact:text-center">
          <span>Fala, Canoas é independente. Não é um canal da Prefeitura.</span>
          <span>Código aberto (AGPL-3.0).</span>
        </p>
      </footer>
    </div>
  );
}
