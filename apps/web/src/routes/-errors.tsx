import { canoas } from "@fala/instance-canoas";
import { useLocation, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ErrorPage, ErrorState } from "@/features/not-found/error-state";
import { NotFoundPage } from "@/features/not-found/not-found-page";
import { useGo } from "./-auth-links";

/** Retrying a failed load: clear the boundary and load the route again. */
function useRetry(reset: () => void) {
  const router = useRouter();
  return () => {
    reset();
    void router.invalidate();
  };
}

/** Any route's failure, drawn where the route would have been (a panel, a section). */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return <ErrorState error={error} onRetry={useRetry(reset)} />;
}

/** A failure with nothing around it: the whole page. */
export function RootError({ error, reset }: ErrorComponentProps) {
  return <ErrorPage error={error} onRetry={useRetry(reset)} go={useGo()} />;
}

/** An address no route answers. */
export function RootNotFound() {
  const pathname = useLocation({ select: (l) => l.pathname });
  return <NotFoundPage muni={canoas} pathname={pathname} go={useGo()} />;
}
