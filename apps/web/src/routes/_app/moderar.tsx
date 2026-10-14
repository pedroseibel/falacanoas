import { canoas } from "@fala/instance-canoas";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GuideGate } from "@/features/moderation/moderation-guide";
import { ModerationPage } from "@/features/moderation/moderation-page";
import {
  awaitingCheckQuery,
  moderationQueueQuery,
  moderationStandingQuery,
  reportedPostsQuery,
  sanctionQueueQuery,
} from "@/lib/city";

export const Route = createFileRoute("/_app/moderar")({
  // Only moderators: anyone else lands on the map, as if the page didn't exist.
  beforeLoad: async ({ context }) => {
    const [queue] = await Promise.all([
      context.queryClient.ensureQueryData(moderationQueueQuery),
      context.queryClient.ensureQueryData(reportedPostsQuery),
      context.queryClient.ensureQueryData(sanctionQueueQuery),
      context.queryClient.ensureQueryData(awaitingCheckQuery),
      context.queryClient.ensureQueryData(moderationStandingQuery),
    ]);
    if (!queue) throw redirect({ to: "/mapa", replace: true });
  },
  head: () => ({ meta: [{ title: "Moderação · Fala, Canoas" }, { name: "robots", content: "noindex" }] }),
  component: ModerarRoute,
});

function ModerarRoute() {
  const { data } = useSuspenseQuery(moderationQueueQuery);
  const { data: posts } = useSuspenseQuery(reportedPostsQuery);
  const { data: sanctions } = useSuspenseQuery(sanctionQueueQuery);
  const { data: awaiting } = useSuspenseQuery(awaitingCheckQuery);
  const { data: standing } = useSuspenseQuery(moderationStandingQuery);
  // The guide first: before the first decision, and after every change to it.
  if (standing?.moderator && !standing.moderator.guideCurrent) return <GuideGate />;
  return (
    <ModerationPage
      cases={data ?? []}
      posts={posts ?? []}
      sanctions={sanctions ?? []}
      awaiting={awaiting}
      muni={canoas}
    />
  );
}
