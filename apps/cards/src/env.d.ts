/** The few Workers runtime types the cards Worker uses (the full set clashes with Bun's test types). */
declare module "cloudflare:workers" {
  export abstract class WorkerEntrypoint<Env = unknown> {
    protected ctx: ExecutionContext;
    protected env: Env;
    constructor(ctx: ExecutionContext, env: Env);
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** In the Worker, a .wasm import is a compiled module (Workers can't compile Wasm from bytes). */
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

/** Vite inlines `?inline` assets as a base64 data URL. */
declare module "*?inline" {
  const url: string;
  export default url;
}
