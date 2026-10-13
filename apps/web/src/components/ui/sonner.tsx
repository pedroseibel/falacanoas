import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterStyle = CSSProperties & Record<`--${string}`, string>;

const toasterStyle: ToasterStyle = {
  "--normal-bg": "var(--ink)",
  "--normal-text": "var(--paper)",
  "--normal-border": "var(--ink)",
  "--border-radius": "var(--radius)",
};

/** Theme follows the system; app.css swaps the tokens when <html data-theme> is set. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner theme="system" style={toasterStyle} position="bottom-center" containerAriaLabel="Notificações" {...props} />
  );
}

export { Toaster };
