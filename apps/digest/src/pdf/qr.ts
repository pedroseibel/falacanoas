import { renderSVG } from "uqr";

/** A report's QR code, as SVG: its public page, so a phone opens the photos, the map and the history. */
export const qrSvg = (url: string) => renderSVG(url, { ecc: "M", border: 0, pixelSize: 4 });
