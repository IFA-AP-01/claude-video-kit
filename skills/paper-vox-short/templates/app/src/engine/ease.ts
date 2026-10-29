export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of t through [a,b], clamped. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const cubicOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const cubicInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Damped wobble after an event `tau` seconds ago (0 before it): sticker slaps, landings, stamps. */
export const spring = (tau: number, decay = 0.12, w = 24) => (tau < 0 ? 0 : Math.exp(-tau / decay) * Math.cos(w * tau));
