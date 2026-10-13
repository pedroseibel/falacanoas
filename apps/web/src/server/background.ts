import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Work that finishes after the response (sending notifications): the Worker's `waitUntil`, reachable
 * from anywhere in a request through the entry (src/server.ts) running each request inside `run`.
 */

interface Execution {
  waitUntil(promise: Promise<unknown>): void;
}

const execution = new AsyncLocalStorage<Execution>();

export const runWith = <T>(ctx: Execution, f: () => T): T => execution.run(ctx, f);

/** Lets `work` outlive the response. Failures are logged, never thrown at the person. */
export function inBackground(label: string, work: Promise<unknown>): void {
  const logged = work.catch((e: unknown) => console.error(`${label}: falhou`, e));
  const ctx = execution.getStore();
  if (ctx) ctx.waitUntil(logged);
}
