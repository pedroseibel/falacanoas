import { Badge } from "@/components/ui/badge";

/** The name, with its comma in the accent (DESIGN.md, the Three Places Rule's brand comma). Size and weight are the caller's. */
export const Wordmark = () => (
  <>
    Fala<span className="text-signal">,</span> Canoas
  </>
);

/** The stage the product is in, beside the name wherever the app's own chrome carries it. */
export const StageBadge = () => <Badge variant="outline">protótipo</Badge>;
