/**
 * The pictograms (DECISIONS round 16, redrawn in round 22): one per category, plus the clock of the
 * "Agora" filter. They follow the public-information norm (ISO 7001's construction, in the
 * public-domain AIGA/DOT drawing style), with the subject of the Brazilian traffic sign (CONTRAN)
 * where one exists: the road dip (a wheel down in it), the traffic light. Construction (research/pictograms):
 *
 * - Solid, single-ink silhouettes on a 24-unit grid, inside 1.5–22.5. Front or side view, or a
 *   section; never perspective. One subject and at most one qualifier.
 * - Edges on a 1.5-unit lattice, bars 3 units: whole pixels at 16, 24, 32 and 48 px, the only sizes
 *   <Icon> takes. Gaps and cut-outs at least 1.5, usually 3. Angles 0°, 45° and 90°.
 * - Even weight: every glyph's ink within a band of the set's median (max/min ≤ 1.4).
 * - Nothing reads as an alarm: no exclamation mark, no diamond, no ring, no slash.
 *
 * Everything else in the interface is lucide. Keep every pictogram behind <Icon name>, so a change
 * happens in this file only (the digest's PDF keeps a copy, checked by a test).
 */

const SYMBOLS = `<symbol id="c-buraco" viewBox="0 0 24 24"><path d="M1.5 12h2.85a7.65 7.65 0 0 0 15.3 0H22.5v9h-21z"/><path fill-rule="evenodd" d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></symbol>
<symbol id="c-alaga" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M8.25 5.25h6l3 4.5 2.25.75c.9.3 1.5 1.1 1.5 2.05V15h-1.5a2.25 2.25 0 0 1-4.5 0H9a2.25 2.25 0 0 1-4.5 0H3v-3.75c0-.85.7-1.5 1.5-1.5H6zm.75 1.5-1.5 2.25h3.75V6.75zm3.75 0V9h3.25l-1.5-2.25z"/><path d="M1.5 19.5c1.75 0 1.75-1.5 3.5-1.5s1.75 1.5 3.5 1.5 1.75-1.5 3.5-1.5 1.75 1.5 3.5 1.5 1.75-1.5 3.5-1.5 1.75 1.5 3.5 1.5v2.25h-21z"/></symbol>
<symbol id="c-bocalobo" viewBox="0 0 24 24"><path d="M12 1.5s-3.75 4.2-3.75 6.6a3.75 3.75 0 0 0 7.5 0C15.75 5.7 12 1.5 12 1.5z"/><path fill-rule="evenodd" d="M3 15h18a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 21 21H3a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 3 15zM4.5 16.5v3h3v-3zm6 0v3h3v-3zm6 0v3h3v-3z"/></symbol>
<symbol id="c-lixo" viewBox="0 0 24 24"><path d="M8.25 8.25c3 0 4.3 2.2 5 4.7l.7 2.5c.55 2.1-.75 3.8-2.85 3.8H5.4c-2.1 0-3.4-1.7-2.85-3.8l.7-2.5c.7-2.5 2-4.7 5-4.7z"/><path d="M7 6h2.5l.6 1.5H6.4z"/><path d="M5.5 3c1.1 0 2.3.8 2.6 2.75H6.75C6.25 5.15 5.7 4.35 5.5 3zM11 3c-1.1 0-2.3.8-2.6 2.75h1.35c.5-.6 1.05-1.4 1.25-2.75z"/><path d="M18.75 12.75c1.9 0 2.75 1.4 3.2 3l.3 1.2c.35 1.5-.45 2.8-2 2.8H17.25c-1.55 0-2.35-1.3-2-2.8l.3-1.2c.45-1.6 1.3-3 3.2-3z"/><path d="M17.75 11.25h2l.4 1.2h-2.8z"/></symbol>
<symbol id="c-entulho" viewBox="0 0 24 24"><rect x="1.5" y="16.5" width="6" height="4.5" rx=".75"/><rect x="9" y="16.5" width="6" height="4.5" rx=".75"/><rect x="16.5" y="16.5" width="6" height="4.5" rx=".75"/><rect x="5.25" y="10.5" width="6" height="4.5" rx=".75"/><rect x="12.75" y="10.5" width="6" height="4.5" rx=".75"/><rect x="9" y="4.5" width="6" height="4.5" rx=".75" transform="rotate(-15 12 6.75)"/></symbol>
<symbol id="c-poste" viewBox="0 0 24 24"><path d="M6 21V7.5A4.5 4.5 0 0 1 10.5 3H15v3h-4.5A1.5 1.5 0 0 0 9 7.5V21z"/><path d="M3 19.5h9v3H3z"/><path d="M13.6 3.75h6.6c.7 0 1.2.4 1.4 1.05l1.5 4.2c.2.6-.25 1.25-.9 1.25H11.8c-.65 0-1.1-.65-.9-1.25l1.3-4.2c.2-.65.75-1.05 1.4-1.05z"/></symbol>
<symbol id="c-arvore" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 1.5a5.6 5.6 0 0 1 5.5 4.6 4.4 4.4 0 0 1-1.25 8.65H13.5V21h3v1.5h-9V21h3v-6.25H7.75A4.4 4.4 0 0 1 6.5 6.1 5.6 5.6 0 0 1 12 1.5zM11.25 10.06v4.69h1.5v-4.69l1.97-1.97-1.06-1.06L12 8.69l-1.66-1.66-1.06 1.06z"/></symbol>
<symbol id="c-calcada" viewBox="0 0 24 24"><path d="M1.5 13.5h9v6h-9z"/><path d="M12 10.5l10.5 3v6L12 16.5z"/><path d="M1.5 21h21v1.5h-21z"/></symbol>
<symbol id="c-esgoto" viewBox="0 0 24 24"><path d="M1.5 4.5h4.5V3h3v1.5h4.5V3h3v7.5h-3V9H9v1.5H6V9H1.5z"/><path d="M15 11.25s-2.25 2.55-2.25 3.9a2.25 2.25 0 0 0 4.5 0c0-1.35-2.25-3.9-2.25-3.9z"/><path d="M1.5 19.5c1.75 0 1.75-1.5 3.5-1.5s1.75 1.5 3.5 1.5 1.75-1.5 3.5-1.5 1.75 1.5 3.5 1.5 1.75-1.5 3.5-1.5 1.75 1.5 3.5 1.5v3h-21z"/></symbol>
<symbol id="c-sinal" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9 1.5h6A1.5 1.5 0 0 1 16.5 3v1.5h3l-3 3V9h3l-3 3v1.5h3l-3 3V18a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 18v-1.5l-3-3h3V12l-3-3h3V7.5l-3-3h3V3A1.5 1.5 0 0 1 9 1.5zM12 3.75a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 5.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 5.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M10.5 19.5h3v3h-3z"/></symbol>
<symbol id="c-questao" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.75 1.5h10.5a4.5 4.5 0 0 1 4.5 4.5v9a4.5 4.5 0 0 1-4.5 4.5h-7.5l-3 3v-3a4.5 4.5 0 0 1-4.5-4.5V6a4.5 4.5 0 0 1 4.5-4.5zm0 3A1.5 1.5 0 0 0 5.25 6v9a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5z"/><path d="M9.9 8.55a2.1 1.5 0 1 1 3.71.96c-.9.4-1.61.5-1.61.89" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.05"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2.25"/></g></symbol>`;

export type IconName =
  | "c-buraco"
  | "c-alaga"
  | "c-bocalobo"
  | "c-lixo"
  | "c-entulho"
  | "c-poste"
  | "c-arvore"
  | "c-calcada"
  | "c-esgoto"
  | "c-sinal"
  | "c-questao"
  | "i-clock";

const ICON_SET = new Set<string>([
  "c-buraco",
  "c-alaga",
  "c-bocalobo",
  "c-lixo",
  "c-entulho",
  "c-poste",
  "c-arvore",
  "c-calcada",
  "c-esgoto",
  "c-sinal",
  "c-questao",
  "i-clock",
]);

export function isIconName(s: string): s is IconName {
  return ICON_SET.has(s);
}

export function IconSprite() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: SYMBOLS }}
    />
  );
}

export function Icon({
  name,
  className = "shrink-0",
  size = 16,
}: {
  name: IconName;
  className?: string;
  /** Only the sizes the grid lands on whole pixels at. */
  size?: 16 | 24 | 32 | 48;
}) {
  return (
    <svg className={className} width={size} height={size} fill="currentColor" aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}

export const categoryIcon = (key: string): IconName => {
  const name = `c-${key}`;
  return isIconName(name) ? name : "c-questao";
};
