/**
 * Icon set: TEMPORARY. These hand-drawn glyphs are to be replaced by a set that follows a
 * signage norm (traffic and public-information pictograms; see research/DECISIONS.md, round 16).
 * Keep every icon behind <Icon name>, so the swap happens in this file only.
 */
const SYMBOLS = `<symbol id="i-map" viewBox="0 0 24 24"><path d="M3.5 6.5l5-2 7 2.5 5-2v13l-5 2-7-2.5-5 2z"/><path d="M8.5 4.5v13M15.5 7v13"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6.5 16V11M11 16V6M15.5 16v-3.5M20 16V8.5"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-back" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-share" viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></symbol>
<symbol id="i-more" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></symbol>
<symbol id="i-repeat" viewBox="0 0 24 24"><path d="M17 3.5l3 3-3 3"/><path d="M4 11.5v-1A4 4 0 0 1 8 6.5h12"/><path d="M7 20.5l-3-3 3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/></symbol>
<symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></symbol>
<symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.4"/></symbol>
<symbol id="i-image" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5 4 4"/></symbol>
<symbol id="i-locate" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="7"/></symbol>
<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><path d="M20 4L3.5 10.8l6.6 2.6 2.6 6.6L20 4zM10.1 13.4L20 4"/></symbol>
<symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19.5l1.5-4.6A7.5 7.5 0 1 1 20 11.5z"/></symbol>
<symbol id="i-mask" viewBox="0 0 24 24"><path d="M4 8.5c2.6-1.4 5.3-2 8-2s5.4.6 8 2c0 6-3.2 9.5-8 9.5S4 14.5 4 8.5z"/><path d="M8 11.5c.9-.7 1.9-.7 2.8 0M13.2 11.5c.9-.7 1.9-.7 2.8 0"/></symbol>
<symbol id="i-badge" viewBox="0 0 24 24"><path d="M12 3.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.2L12 20.5l-2.2-1.6-2.7.2-.9-2.6L4 14.9l.8-2.6L4 9.7l2.2-1.6.9-2.6 2.7.2z"/><path d="M9 12l2 2 4-4"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6"/><path d="M15 6a3 3 0 0 1 0 6M17 14.6c1.8.4 3 1.9 3.6 4.4"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/></symbol>
<symbol id="i-sliders" viewBox="0 0 24 24"><path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></symbol>
<symbol id="i-route" viewBox="0 0 24 24"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16"/></symbol>
<symbol id="c-buraco" viewBox="0 0 24 24"><path d="M3.5 15.5c0-2.6 3.8-4.6 8.5-4.6s8.5 2 8.5 4.6-3.8 4.5-8.5 4.5-8.5-1.9-8.5-4.5z"/><path d="M7.5 15c1.3-1 2.8-1.5 4.5-1.5s3.2.5 4.5 1.5"/><path d="M12 4v3.5M9 5.5l1 2M15 5.5l-1 2"/></symbol>
<symbol id="c-alaga" viewBox="0 0 24 24"><path d="M12 3.5s4.8 5.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0C7.2 8.7 12 3.5 12 3.5z"/><path d="M3 19.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/></symbol>
<symbol id="c-bocalobo" viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 7v10M12 7v10M16 7v10"/><path d="M3 20h18"/></symbol>
<symbol id="c-lixo" viewBox="0 0 24 24"><path d="M5 7h14M9.5 7V4.5h5V7"/><path d="M6.5 7l1 12.5h9l1-12.5"/><path d="M10 10.5v6M14 10.5v6"/></symbol>
<symbol id="c-entulho" viewBox="0 0 24 24"><path d="M3.5 19.5h17"/><rect x="5" y="14.5" width="6" height="5"/><rect x="11" y="14.5" width="7.5" height="5"/><rect x="7.5" y="9.5" width="7" height="5"/><path d="M15.5 9.5l2.5-3.5 2 2.5"/></symbol>
<symbol id="c-poste" viewBox="0 0 24 24"><path d="M9 21V6.5A2.5 2.5 0 0 1 11.5 4H15"/><path d="M13.5 4h4l1.5 3h-7z"/><path d="M6.5 21h5"/><path d="M15.5 10l.5 1.5M18.5 9.5l-.5 1.5"/></symbol>
<symbol id="c-arvore" viewBox="0 0 24 24"><path d="M12 21v-6"/><path d="M12 15c-4 0-6.5-2.3-6.5-5.3 0-2 1.3-3.5 3-4A4.2 4.2 0 0 1 16 5.5c2 .4 3 2 3 4 0 3.2-3 5.5-7 5.5z"/><path d="M9 21h6"/></symbol>
<symbol id="c-calcada" viewBox="0 0 24 24"><path d="M3.5 18.5h17M3.5 14h17"/><path d="M8 14v4.5M13 14l-1.5 2 1 2.5M17.5 14v4.5"/><circle cx="12" cy="5.5" r="1.6"/><path d="M10.5 11.5l1.5-3.5 2 1.5"/></symbol>
<symbol id="c-esgoto" viewBox="0 0 24 24"><path d="M3.5 8.5h8a3 3 0 0 1 3 3v1"/><path d="M3.5 5.5h8a6 6 0 0 1 6 6v1"/><path d="M14.5 15.5s-1.5 1.8-1.5 2.8a1.5 1.5 0 0 0 3 0c0-1-1.5-2.8-1.5-2.8z"/></symbol>
<symbol id="c-sinal" viewBox="0 0 24 24"><rect x="8.5" y="3.5" width="7" height="14" rx="2"/><circle cx="12" cy="7.2" r="1.2"/><circle cx="12" cy="10.5" r="1.2"/><circle cx="12" cy="13.8" r="1.2"/><path d="M12 17.5v3.5"/></symbol>
<symbol id="c-questao" viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19.5l1.5-4.6A7.5 7.5 0 1 1 20 11.5z"/><path d="M10.2 9.5a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.2v.5M12 15.2h.01"/></symbol>`;

export type IconName =
  | "i-map"
  | "i-chart"
  | "i-home"
  | "i-user"
  | "i-plus"
  | "i-search"
  | "i-down"
  | "i-back"
  | "i-close"
  | "i-share"
  | "i-more"
  | "i-check"
  | "i-eye"
  | "i-repeat"
  | "i-edit"
  | "i-bell"
  | "i-camera"
  | "i-image"
  | "i-locate"
  | "i-minus"
  | "i-send"
  | "i-chat"
  | "i-mask"
  | "i-badge"
  | "i-users"
  | "i-clock"
  | "i-info"
  | "i-sliders"
  | "i-route"
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
  | "c-questao";

const ICON_SET = new Set<string>([
  "i-map",
  "i-chart",
  "i-home",
  "i-user",
  "i-plus",
  "i-search",
  "i-down",
  "i-back",
  "i-close",
  "i-share",
  "i-more",
  "i-check",
  "i-eye",
  "i-repeat",
  "i-edit",
  "i-bell",
  "i-camera",
  "i-image",
  "i-locate",
  "i-minus",
  "i-send",
  "i-chat",
  "i-mask",
  "i-badge",
  "i-users",
  "i-clock",
  "i-info",
  "i-sliders",
  "i-route",
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
  size = 18,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <use href={`#${name}`} />
    </svg>
  );
}

export const categoryIcon = (key: string): IconName => {
  const name = `c-${key}`;
  return isIconName(name) ? name : "c-questao";
};
