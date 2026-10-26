/**
 * The category pictograms (the app's, from apps/web/src/components/Icons.tsx), as standalone SVGs for the
 * PDF: the digest service runs apart from the web app, so it carries its own copy. pictograms.test.ts
 * fails if they drift from the app's. Drawn in currentColor; the template recolours them.
 */
export const PICTOGRAMS: Record<string, string> = {
  buraco:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 5.5a5.75 5.75 0 1 1 0 11.5 5.75 5.75 0 0 1 0-11.5zm0 3.25a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/><path d="M2 14h2.5v1.5c0 2.4 3.4 4 7.5 4s7.5-1.6 7.5-4V14H22v8H2z"/></svg>',
  alaga:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M4.5 14.1V10.9c0-.8.5-1.4 1.3-1.6l2.6-.5 1.9-2.8c.4-.6 1-.9 1.7-.9h2.9c.7 0 1.3.3 1.7.9l1.9 2.8 1.1.3c.8.2 1.4.9 1.4 1.7v3.3c-.833 0-1.667 1.6-2.5 1.6s-1.667-1.6-2.5-1.6-1.667 1.6-2.5 1.6-1.667-1.6-2.5-1.6-1.667 1.6-2.5 1.6-1.667-1.6-2.5-1.6zM11.2 7.4h3.3l1.3 2h-5.9z"/><path d="M2 16.5c.833 0 1.667-1.6 2.5-1.6s1.667 1.6 2.5 1.6 1.667-1.6 2.5-1.6 1.667 1.6 2.5 1.6 1.667-1.6 2.5-1.6 1.667 1.6 2.5 1.6 1.667-1.6 2.5-1.6 1.667 1.6 2.5 1.6V22H2z"/></svg>',
  bocalobo:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2s-2.6 2.9-2.6 4.6a2.6 2.6 0 0 0 5.2 0c0-1.7-2.6-4.6-2.6-4.6z"/><path fill-rule="evenodd" d="M5 12h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm1 2a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1zm4 0a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1zm4 0a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1zm4 0a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1z"/></svg>',
  lixo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8.6c3.9 0 5.4 2.5 6.6 5.9l.9 2.6c.8 2.4-.9 4.9-3.4 4.9H7.9c-2.5 0-4.2-2.5-3.4-4.9l.9-2.6C6.6 11.1 8.1 8.6 12 8.6z"/><path d="M11 6.6h2l.5 2.6h-3z"/><path d="M12 7.2C10.5 7.2 8.2 5.8 8 4c-.1-.7.5-1.1 1.1-.9 1.6.5 3.3 2.1 2.9 4.1z"/><path d="M12 7.2c1.5 0 3.8-1.4 4-3.2.1-.7-.5-1.1-1.1-.9-1.6.5-3.3 2.1-2.9 4.1z"/></svg>',
  entulho:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="17.75" width="5.33" height="3.75" rx=".6"/><rect x="9.33" y="17.75" width="5.33" height="3.75" rx=".6"/><rect x="16.67" y="17.75" width="5.33" height="3.75" rx=".6"/><rect x="5.67" y="12" width="5.33" height="3.75" rx=".6"/><rect x="13" y="12" width="5.33" height="3.75" rx=".6"/><rect x="9.33" y="5.4" width="5.33" height="3.75" rx=".6" transform="rotate(-14 12 7.3)"/></svg>',
  poste:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="5.75" y="6.5" width="2.5" height="14" /><rect x="3.75" y="19.75" width="6.5" height="2.25" rx=".75"/><path d="M7 7.5c0-2.6 1.7-4.25 4.3-4.25H14" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M13.6 2h5.1c.7 0 1.3.4 1.5 1.1l1.2 3.4c.2.6-.3 1.2-.9 1.2h-8.6c-.7 0-1.1-.6-.9-1.2l1.2-3.4c.2-.7.8-1.1 1.4-1.1z"/></svg>',
  arvore:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="6"/><circle cx="7.3" cy="11.2" r="4.2"/><circle cx="16.7" cy="11.2" r="4.2"/><path d="M10.75 13h2.5v7.5l1.75 1.5h-6l1.75-1.5z"/></svg>',
  calcada:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12.3" cy="3.3" r="2.1"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11.7 6.9l-.7 4.7" stroke-width="3"/><path d="M11.5 7.9L9.3 10l-.7 2.4M12 7.9l2.3 1.9 2.1.8" stroke-width="2.2"/><path d="M11 11.6l-1.6 2.7-2.2 2.1M11 11.6l2 2.6.5 2.3" stroke-width="2.5"/></g><path d="M2 19.75h13.5V22H2z"/><path d="M17.5 18.5H22V22h-4.5z"/></svg>',
  esgoto:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.5h7.2c1 0 1.8 1.6 1.8 3.5s-.8 3.5-1.8 3.5H2z"/><path d="M10.2 9.2c2.9.4 4.8 2.2 4.8 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4.5 19.4c1.3 0 2.2-1 3.5-1s2.2 1 3.5 1 2.2-1 3.5-1 2.2 1 3.5 1 2.2-1 3.5-1V22H4.5z"/></svg>',
  sinal:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M10 1.5h4a2.5 2.5 0 0 1 2.5 2.5v10.5A2.5 2.5 0 0 1 14 17h-4a2.5 2.5 0 0 1-2.5-2.5V4A2.5 2.5 0 0 1 10 1.5zm2 1.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 4.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 4.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M10.75 16h2.5v6h-2.5z"/></svg>',
  questao:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M6.5 3h11a4 4 0 0 1 4 4v6.5a4 4 0 0 1-4 4h-6.8l-4.5 3.7c-.6.5-1.4 0-1.3-.7l.5-3.1A4 4 0 0 1 2.5 13.5V7a4 4 0 0 1 4-4zm5.5 2.75c-.7 0-1.25.55-1.25 1.25v3.5a1.25 1.25 0 0 0 2.5 0V7c0-.7-.55-1.25-1.25-1.25zm0 6.8a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7z"/></svg>',
};

/** A category's pictogram, or the generic one ("questao") for a category without its own. */
export const pictogramFor = (key: string): string => PICTOGRAMS[key] ?? PICTOGRAMS["questao"] ?? "";
