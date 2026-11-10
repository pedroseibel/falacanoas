/** Whether the person asked the system for less motion: animations then settle at once. */
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
