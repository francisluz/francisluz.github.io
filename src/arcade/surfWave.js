// The invisible wave. Gameplay reads this model; the renderer draws
// artwork that follows it. Nothing ever inspects drawn pixels.
//
// Coordinates:
//   X  world position along the wave, in fat px. The break point moves
//      along +X at breakSpeed, peeling the wave toward the shoulder.
//   d  X - breakX: distance ahead of the break. d < 0 is whitewater.
//   u  height up the face in rows above the trough (0 = bottom).
//   f  u / faceH: 0 at the trough, 1 at the lip.

export const HORIZON = 48;
export const TROUGH = 180; // screen row of the wave's base
export const SESSION = 90;

export const Zone = {
  WHITEWATER: 'whitewater',
  POCKET: 'pocket',
  FACE: 'face',
  SHOULDER: 'shoulder',
  LIP: 'lip',
};

// Hand-authored session. Each entry takes over at `t` and is blended in
// over BLEND seconds, so the swell builds as one continuous ride.
const PHASES = [
  { t: 0, height: 92, breakSpeed: 15, steep: 1.0, push: 1.0, curl: 12 }, // small, forgiving
  { t: 20, height: 104, breakSpeed: 17, steep: 1.1, push: 1.08, curl: 14 }, // medium
  { t: 45, height: 116, breakSpeed: 19.5, steep: 1.25, push: 1.18, curl: 17 }, // steeper pocket
  { t: 70, height: 124, breakSpeed: 22, steep: 1.4, push: 1.3, curl: 20 }, // large, fast
];
const BLEND = 6;
const KEYS = ['height', 'breakSpeed', 'steep', 'push', 'curl'];

export function sessionParams(t) {
  let i = 0;
  while (i + 1 < PHASES.length && t >= PHASES[i + 1].t) i += 1;
  const cur = PHASES[i];
  if (i === 0) return { ...cur };
  const prev = PHASES[i - 1];
  const k = Math.min(1, (t - cur.t) / BLEND);
  const out = {};
  for (const key of KEYS) out[key] = prev[key] + (cur[key] - prev[key]) * k;
  return out;
}

export function createWave() {
  const w = {
    breakX: 0,
    t: 0,
    p: sessionParams(0),
    surge: 1,

    update(dt, t, extra = 0) {
      w.t = t;
      w.p = sessionParams(t);
      // the break point surges and backs off, so the pocket slowly
      // wanders relative to a surfer holding a steady line
      w.surge = 1 + 0.22 * Math.sin(t * 0.55) + 0.1 * Math.sin(t * 1.37 + 1);
      w.breakX += (w.p.breakSpeed * w.surge + extra) * dt;
    },

    // face height tapers from the peak toward the shoulder
    faceH(d) {
      const dd = Math.max(0, d);
      return w.p.height * (0.62 + 0.38 * Math.exp(-dd / 95));
    },

    lipY(X) {
      return TROUGH - w.faceH(X - w.breakX);
    },

    // how hard gravity pulls along the face at a given height: nearly
    // flat at the trough, near vertical under the lip, steeper in the pocket
    steepness(d, f) {
      const pocket = 1 + 0.45 * Math.exp(-Math.max(0, d) / 40);
      return w.p.steep * pocket * (0.22 + 0.95 * f * f);
    },

    zone(d, f) {
      if (d < 0) return Zone.WHITEWATER;
      if (f > 0.86) return Zone.LIP;
      if (d < w.p.curl + 22) return Zone.POCKET;
      if (d > 125) return Zone.SHOULDER;
      return Zone.FACE;
    },

    // energy the breaking wave hands a surfer: strongest high in the
    // pocket, never quite nothing while you are still on the face
    push(d, f) {
      const dd = Math.max(0, d);
      return w.p.push * 16 * (0.25 + Math.exp(-dd / 70)) * (0.3 + 0.8 * Math.min(1, f));
    },

    sample(X, u) {
      const d = X - w.breakX;
      const faceH = w.faceH(d);
      const f = Math.max(0, u) / faceH;
      return {
        d,
        f,
        faceH,
        surfaceY: TROUGH - u,
        lipY: TROUGH - faceH,
        slope: w.steepness(d, f),
        steepness: w.steepness(d, f),
        velocityX: w.p.breakSpeed * w.surge,
        zone: w.zone(d, f),
      };
    },
  };
  return w;
}
