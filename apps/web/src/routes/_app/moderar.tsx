import { canoas } from "@fala/instance-canoas";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ModerationPage } from "@/features/moderation/moderation-page";
import { moderationQueueQuery } from "@/lib/city";

export const Route = createFileRoute("/_app/moderar")({
  // Only moderators: anyone else lands on the map, as if the page didn't exist.
  beforeLoad: async ({ context }) => {
    const queue = await context.queryClient.ensureQueryData(moderationQueueQuery);
    if (!queue) throw redirect({ to: "/mapa", replace: true });
  },
  head: () => ({ meta: [{ title: "Moderação · Fala, Canoas" }, { name: "robots", content: "noindex" }] }),
  component: ModerarRoute,
});

function ModerarRoute() {
  const { data } = useSuspenseQuery(moderationQueueQuery);
  return <ModerationPage cases={data ?? []} muni={canoas} />;
}
