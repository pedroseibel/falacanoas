import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { IconSprite } from "@/components/Icons";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import mapCss from "maplibre-gl/dist/maplibre-gl.css?url";
import appCss from "@/styles/globals.css?url";
import { RootError, RootNotFound } from "./-errors";

/** Applies a saved theme before paint (no flash). */
const THEME_BOOT = `try{var t=localStorage.getItem("fc-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

/** The installable app's service worker (public/sw.js), registered after load, in production builds only. */
const SW_BOOT = `if("serviceWorker"in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Fala, Canoas" },
      {
        name: "description",
        content: "Mapa independente e de código aberto dos problemas urbanos de Canoas, RS, contados em dias.",
      },
      { name: "theme-color", content: "#FAFAFA", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0A0A0B", media: "(prefers-color-scheme: dark)" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Fala, Canoas" },
    ],
    links: [
      { rel: "preload", href: "/fonts/geist-latin.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      {
        rel: "preload",
        href: "/fonts/geist-mono-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: mapCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
    scripts: [{ children: THEME_BOOT }, ...(import.meta.env.PROD ? [{ children: SW_BOOT }] : [])],
  }),
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <IconSprite />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
