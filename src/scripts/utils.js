'use strict';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const ease = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
export const lerpH = (a, b, t) => {
  let d = b[0] - a[0];
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return [a[0] + d * t, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
};
export const hsl = (h, s, l, a) => a != null
  ? `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a})`
  : `hsl(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%)`;

export class Spring {
  constructor(v = 0, k = .055, d = .87) {
    this.x = this.t = v;
    this.v = 0;
    this.k = k;
    this.d = d;
  }
  tick() {
    this.v = (this.v + (this.t - this.x) * this.k) * this.d;
    this.x += this.v;
  }
  to(t) {
    this.t = t;
  }
  snap(v) {
    this.x = this.t = v;
    this.v = 0;
  }
}
