import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_map/")({
  head: () => ({ meta: [{ title: "Fala, Canoas · o que está acontecendo em Canoas" }] }),
  component: () => null,
});
