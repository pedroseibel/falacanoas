import { StageBadge, Wordmark } from "@/components/wordmark";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { AppLink, Go } from "@/components/app-link";
import { cn } from "@/lib/utils";

function Foot({ note }: { note?: string }) {
  return (
    <footer className="pb-safe border-t border-hairline">
      <p className="mx-auto flex w-full max-w-wrap flex-wrap justify-between gap-x-6 gap-y-1 px-gutter py-4 text-caption text-muted-foreground max-compact:justify-center max-compact:text-center">
        <span>Fala, Canoas é independente. Não é um canal da Prefeitura.</span>
        <span>Código aberto (AGPL-3.0).{note ? ` ${note}` : ""}</span>
      </p>
    </footer>
  );
}

/**
 * The sign-in pages stand alone (no app header, search or tab bar): the wordmark, one way back,
 * a single column in the upper third, and the independence facts at the foot.
 */
export function AuthFrame({
  back,
  width = "form",
  children,
}: {
  back: AppLink;
  /** form: the sign-in column; read: a measure for running text (the privacy notice). */
  width?: "form" | "read";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-wrap items-center justify-between gap-4 px-gutter">
          <span className="inline-flex items-center gap-2.5">
            <span className="text-wordmark font-semibold whitespace-nowrap">
              <Wordmark />
            </span>
            <StageBadge />
          </span>
          <a
            href={back.href}
            onClick={back.onClick}
            className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-ui text-ink-2 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar
          </a>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-gutter pt-head pb-section-sm max-compact:pt-8">
        <div className={cn("grid w-full content-start gap-8", width === "read" ? "max-w-note" : "max-w-auth")}>
          {children}
        </div>
      </main>
      <Foot note="Para maiores de 18 anos." />
    </div>
  );
}

export function AuthHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-heading font-semibold text-balance">{title}</h1>
      <p className="text-ui text-pretty text-ink-2">{children}</p>
    </div>
  );
}

/**
 * A page outside the app's sections (an address that leads nowhere, a failure): the wordmark home,
 * the content in the upper third, the independence facts at the foot.
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
            <Wordmark />
          </a>
          <StageBadge />
        </div>
      </header>
      <main className="flex flex-1 justify-center px-gutter pt-head pb-section-sm max-compact:pt-6">
        <div className="w-full max-w-wrap">{children}</div>
      </main>
      <Foot />
    </div>
  );
}
