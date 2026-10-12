import { createCn } from "cn/config";

/**
 * Class merging that knows the project's own theme scales (globals.css @theme). Without them,
 * a custom size like text-caption reads as a colour and is dropped next to text-ink-2.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: [
        "2xs",
        "micro",
        "caption",
        "ui",
        "body",
        "wordmark",
        "lede",
        "coda",
        "heading",
        "title",
        "display",
        "counter",
      ],
      spacing: [
        "gutter",
        "section",
        "section-sm",
        "head",
        "pair",
        "split",
        "hero",
        "hero-top",
        "hero-bottom",
        "proof",
        "card",
        "rule",
        "bleed",
        "fact",
        "coda",
        "stage-phone",
      ],
      container: ["wrap", "headline", "lede", "coda", "claim", "copy", "foot", "note", "long", "auth"],
      shadow: ["panel", "soft", "float"],
    },
  },
});
