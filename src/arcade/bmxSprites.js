// Native hires BMX sprite sheets.
//
// The game still reasons in VIC multicolor pixels (one logical x unit is two
// screen pixels wide), but these grids are authored at the screen's actual
// 320-pixel width. Keeping the art native here means the wheel circles,
// spokes, and thin frame tubes survive the hires sprite blit.

import { C } from './engine.js';

export const S = 56; // sprite height and logical sprite size
export const N_ROT = 24; // 15° rotation steps
export const AXLE_DX = 7; // logical pixels from centre to each axle
export const WHEEL_R = 8; // rows from axle to tyre contact

// 1=blue frame/jersey, 2=black tyre+outline, 3=white kit, 4=light red skin,
// 5=burnt orange wheel interior. Keep this palette stable: the caller owns
// the VIC colour lookup and the sprite layer is exempt from cell colour clash.
export const COLORS = [C.BLUE, C.BLACK, C.WHITE, C.LIGHTRED, C.ORANGE];
const B = 1, K = 2, Wt = 3, Sk = 4, R = 5;

const W = S * 2;
const CX = S / 2; // logical x = 28, hires x = 56
const AXLE_Y = S / 2;
const H = S / 2;

const REAR = [CX - AXLE_DX, AXLE_Y];
const FRONT = [CX + AXLE_DX, AXLE_Y];
const BB = [CX, AXLE_Y - 1];
const HAND = [CX + 3, AXLE_Y - 14];

const blank = () => Array.from({ length: S }, () => new Uint8Array(W));
const hx = (x) => Math.round(x * 2);

// Logical-coordinate wrappers. Lines and ellipses expand their x extent into
// hires pixels; they do not draw a logical grid and double it later.
const hpx = (g, x, y, c) => {
  x = Math.round(x);
  y = Math.round(y);
  if (y >= 0 && y < S && x >= 0 && x < W) g[y][x] = c;
};

const px = (g, x, y, c) => hpx(g, hx(x), y, c);

const line = (g, x0, y0, x1, y1, c, thick = 1) => {
  const ax = hx(x0);
  const bx = hx(x1);
  const ay = Math.round(y0);
  const by = Math.round(y1);
  const dx = bx - ax;
  const dy = by - ay;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  for (let i = 0; i <= steps; i += 1) {
    const x = ax + (dx * i) / steps;
    const y = ay + (dy * i) / steps;
    for (let t = 0; t < thick; t += 1) {
      if (horizontal) hpx(g, x, y + t, c);
      else hpx(g, x + t, y, c);
    }
  }
};

const ellipse = (g, cx, cy, rx, ry, c) => {
  const x0 = hx(cx);
  const y0 = Math.round(cy);
  const radiusX = Math.max(1, Math.round(rx * 2));
  const radiusY = Math.max(1, Math.round(ry));
  for (let dy = -radiusY; dy <= radiusY; dy += 1) {
    const span = Math.floor(radiusX * Math.sqrt(Math.max(0, 1 - (dy * dy) / (radiusY * radiusY))) + 0.3);
    for (let dx = -span; dx <= span; dx += 1) hpx(g, x0 + dx, y0 + dy, c);
  }
};

const strings = (g) => g.map((row) => Array.from(row, (v) => (v ? String(v) : '.')).join(''));

// Rotate the finished hires sheet around the visual centre. This samples
// square pixels directly; engine.rotationFrames() is intentionally not used
// because it assumes a fat-pixel source grid.
const rotateFrames = (base) => {
  const out = [];
  for (let f = 0; f < N_ROT; f += 1) {
    const angle = (f / N_ROT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rows = [];
    for (let y = 0; y < S; y += 1) {
      let row = '';
      for (let x = 0; x < W; x += 1) {
        const dx = x - W / 2;
        const dy = y - H;
        const sx = Math.round(dx * cos + dy * sin + W / 2);
        const sy = Math.round(-dx * sin + dy * cos + H);
        row += sx >= 0 && sx < W && sy >= 0 && sy < S ? base[sy][sx] : '.';
      }
      rows.push(row);
    }
    out.push(rows);
  }
  return out;
};

// Wheels are deliberately drawn as circles in hires space. The white rim,
// orange hub area, and dark spokes stay legible at the game's small scale.
const wheel = (g, cx, cy) => {
  ellipse(g, cx, cy, 4, WHEEL_R, K);
  // A logical four-pixel radius occupied two hires columns per source pixel;
  // retain that 46-pixel axle-to-axle footprint at the native boundary.
  hpx(g, hx(cx) + 9, Math.round(cy), K);
  ellipse(g, cx, cy, 3, 6, Wt);
  ellipse(g, cx, cy, 2, 4, R);
  line(g, cx, cy, cx, cy - 3.5, K);
  line(g, cx, cy, cx, cy + 3.5, K);
  line(g, cx, cy, cx - 2.2, cy - 3.2, K);
  line(g, cx, cy, cx + 2.2, cy - 3.2, K);
  line(g, cx, cy, cx - 2.2, cy + 3.2, K);
  line(g, cx, cy, cx + 2.2, cy + 3.2, K);
  px(g, cx, cy, K);
  hpx(g, hx(cx) + 1, Math.round(cy), K);
};

const bikeFrame = (g) => {
  wheel(g, REAR[0], REAR[1]);
  wheel(g, FRONT[0], FRONT[1]);
  const seat = [CX - 3, AXLE_Y - 9];
  const headTube = [CX + 5, AXLE_Y - 8];

  // Slim blue tubes, with a closed rear triangle and a readable fork.
  line(g, REAR[0], REAR[1], BB[0], BB[1], B);
  line(g, BB[0], BB[1], seat[0], seat[1], B);
  line(g, seat[0], seat[1], REAR[0], REAR[1], B);
  line(g, seat[0], seat[1], headTube[0], headTube[1], B);
  line(g, BB[0], BB[1], headTube[0] - 1, headTube[1] + 2, B);
  line(g, headTube[0], headTube[1], FRONT[0], FRONT[1], B);
  line(g, headTube[0], headTube[1], headTube[0], headTube[1] - 5, B);
  line(g, headTube[0], headTube[1] - 5, HAND[0], HAND[1], B);
  line(g, seat[0] - 1.5, seat[1] - 1, seat[0] + 1.5, seat[1] - 1, K, 2);
};

const cranks = (g, phi) => {
  const fx = BB[0] + Math.cos(phi) * 2.5;
  const fy = BB[1] + Math.sin(phi) * 5;
  const bx = BB[0] - Math.cos(phi) * 2.5;
  const by = BB[1] - Math.sin(phi) * 5;
  line(g, BB[0], BB[1], bx, by, K);
  line(g, BB[0], BB[1], fx, fy, K);
  px(g, BB[0], BB[1], K);
  return [[fx, fy], [bx, by]];
};

// A compact black outline keeps white pants and sleeves separate from the
// blue frame, especially on the rotated crash frames.
const limb = (g, a, b, c, width = 3) => {
  line(g, a[0], a[1], b[0], b[1], K, width + 2);
  line(g, a[0], a[1], b[0], b[1], c, width);
};

const leg = (g, hip, foot, shade) => {
  const knee = [(hip[0] + foot[0]) / 2 + 1.5, (hip[1] + foot[1]) / 2];
  const width = shade === Wt ? 4 : 3;
  limb(g, [hip[0], hip[1]], knee, shade, width);
  limb(g, knee, foot, shade, width);
  line(g, foot[0] - 0.8, foot[1], foot[0] + 1.8, foot[1], B, 2);
};

const rider = (g, pose, feet) => {
  const { hip, sh, head } = pose;
  const hand = pose.hand || HAND;

  // Rear leg first, then the lit front leg on top.
  leg(g, [hip[0] - 1, hip[1]], feet[1], B);

  // Jersey: outlined blue torso with one white vertical stripe.
  line(g, hip[0], hip[1], sh[0], sh[1], K, 9);
  line(g, hip[0], hip[1], sh[0], sh[1], B, 7);
  line(g, hip[0] + 1.2, hip[1] - 1, sh[0] + 1.2, sh[1] + 1, Wt, 1);

  // White sleeve and salmon hand reaching to the bars.
  limb(g, sh, hand, Wt, 3);
  px(g, hand[0], hand[1], Sk);
  hpx(g, hx(hand[0]) + 1, Math.round(hand[1]), Sk);

  // Helmet, brim, and a small face patch.
  ellipse(g, head[0], head[1], 2.2, 3, K);
  ellipse(g, head[0], head[1] - 0.3, 1.8, 2.5, Wt);
  line(g, head[0] - 0.5, head[1] + 1.5, head[0] + 2.8, head[1] + 1.5, K);
  px(g, head[0] + 1.6, head[1] + 2.3, Sk);
  hpx(g, hx(head[0]) + 4, Math.round(head[1] + 2.3), Sk);

  leg(g, hip, feet[0], Wt);
};

// Upright on the pedals, with the same logical anchors used by the physics.
const RIDE = { hip: [CX - 3, AXLE_Y - 11], sh: [CX + 2, AXLE_Y - 20], head: [CX + 2, AXLE_Y - 23] };

const POSE_DEF = {
  coast: { ...RIDE, phi: 0 },
  pedal0: { ...RIDE, phi: 0.6 },
  pedal1: { ...RIDE, phi: 2.17 },
  pedal2: { ...RIDE, phi: 3.74 },
  pedal3: { ...RIDE, phi: 5.31 },
  crouch: { hip: [CX - 2, AXLE_Y - 8], sh: [CX + 3, AXLE_Y - 15], head: [CX + 5, AXLE_Y - 19], phi: 0 },
  air: { hip: [CX - 2, AXLE_Y - 9], sh: [CX + 3, AXLE_Y - 17], head: [CX + 5, AXLE_Y - 21], phi: 0 },
};

const buildPose = (def) => {
  const g = blank();
  bikeFrame(g);
  const feet = cranks(g, def.phi);
  rider(g, def, feet);
  return rotateFrames(strings(g));
};

export const POSES = {};
for (const [name, def] of Object.entries(POSE_DEF)) POSES[name] = buildPose(def);

const bikeOnly = () => {
  const g = blank();
  bikeFrame(g);
  cranks(g, 0.8);
  return rotateFrames(strings(g));
};
export const BIKE_ROT = bikeOnly();

// Crash frames use the same rider scale. Feet remain on FOOT_Y so the game
// can align the separated rider with the ground contact without new physics.
export const FOOT_Y = AXLE_Y + WHEEL_R;

const buildRiderOnly = (def) => {
  const g = blank();
  rider(g, def, def.feet);
  return strings(g);
};

export const TUMBLE_ROT = rotateFrames(buildRiderOnly({
  hip: [CX - 1, AXLE_Y + 2],
  sh: [CX + 3, AXLE_Y - 4],
  head: [CX + 5, AXLE_Y - 7],
  hand: [CX + 7, AXLE_Y - 1],
  feet: [[CX - 7, AXLE_Y + 5], [CX - 6, AXLE_Y + 8]],
}));

export const SIT = buildRiderOnly({
  hip: [CX - 3, FOOT_Y - 3],
  sh: [CX - 5, FOOT_Y - 11],
  head: [CX - 4, FOOT_Y - 15],
  hand: [CX + 2, FOOT_Y - 4],
  feet: [[CX + 6, FOOT_Y], [CX + 5, FOOT_Y - 1]],
});

export const GETUP = buildRiderOnly({
  hip: [CX - 1, FOOT_Y - 9],
  sh: [CX, FOOT_Y - 17],
  head: [CX + 1, FOOT_Y - 21],
  hand: [CX + 6, FOOT_Y - 13],
  feet: [[CX + 1, FOOT_Y], [CX - 3, FOOT_Y]],
});
