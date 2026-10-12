/**
 * Scroll motion for the landing page as React 19 ref callbacks (set up on attach, torn down by the
 * returned cleanup). No effects: each element owns its observer. Server HTML is always the final
 * state, so nothing hides without JavaScript or with reduced motion.
 */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const noop = () => {};

/** Rises into place when scrolled to. Only elements below the first screen start lowered. */
export function reveal(el: HTMLElement | null) {
  if (!el || reduced() || el.getBoundingClientRect().top <= innerHeight * 0.92) return;
  el.dataset.pre = "";
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      delete el.dataset.pre;
      io.disconnect();
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Counts a number up from zero, pt-BR formatted, with an exponential ease-out. */
export function roll(el: HTMLElement, to: number, duration: number) {
  if (reduced() || !duration) {
    el.textContent = fmt(to);
    return noop;
  }
  let frame = 0;
  let t0: number | null = null;
  const step = (t: number) => {
    t0 ??= t;
    const p = Math.min(1, (t - t0) / duration);
    el.textContent = fmt(Math.round(to * (p === 1 ? 1 : 1 - 2 ** (-10 * p))));
    if (p < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    el.textContent = fmt(to);
  };
}

/** Rolls up when at least 60% visible. */
export const countUpOnView = (to: number) => (el: HTMLElement | null) => {
  if (!el || reduced()) return;
  el.textContent = "0";
  let stop = noop;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      stop = roll(el, to, 1400);
      io.disconnect();
    },
    { threshold: 0.6 },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    stop();
  };
};

/** Rolls up as soon as it mounts (remount with a key to replay). */
export const countUpNow = (to: number) => (el: HTMLElement | null) => (el ? roll(el, to, 650) : undefined);

/** Marks the sticky header once the page has scrolled, for its hairline. */
export function stuckOnScroll(el: HTMLElement | null) {
  if (!el) return;
  const update = () => el.toggleAttribute("data-stuck", scrollY > 8);
  update();
  addEventListener("scroll", update, { passive: true });
  return () => removeEventListener("scroll", update);
}
