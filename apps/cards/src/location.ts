/**
 * Emscripten glue (Satori's layout engine, the WebP decoder) sees a worker and reads
 * `self.location.href` for where to fetch its .wasm from. A Worker has no usable location (the dev
 * runtime sets one without `href`), and the modules here come precompiled, so a placeholder is
 * enough. Call before initialising them.
 */
export function provideLocation(): void {
  const current = Reflect.get(globalThis, "location");
  if (typeof (current && Reflect.get(current, "href")) === "string") return;
  Object.defineProperty(globalThis, "location", {
    value: new URL("https://cartoes.invalid/"),
    configurable: true,
    writable: true,
  });
}
