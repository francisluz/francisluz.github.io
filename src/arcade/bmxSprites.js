// Discrete sprite frames for the BMX rider, composed once at init the
// way C64 artists shipped hand-drawn rotation steps: each pose is
// rendered into a fat-pixel grid, then pre-rotated in 15° increments.
// The game only ever blits whole frames — no tweening, no smooth
// rotation of pixel art.
//
// Sprite geometry (fat px, rows):
//   grid is S x S with the mid-point between the two axles at its centre
//   axles sit AXLE_DX either side of centre, tyres reach WHEEL_R rows
//   below the axle line, so ground contact = centre row + WHEEL_R.

import { C, rotationFrames } from './engine.js';

export const S = 56; // sprite grid size
export const N_ROT = 24; // 15° rotation steps
export const AXLE_DX = 7; // fat px from centre to each axle
export const WHEEL_R = 8; // rows from axle to tyre contact

// 1=blue frame/jersey, 2=black tyre+outline, 3=white kit, 4=red wheel
// disc, 5=skin. Chosen so the rider reads against the olive desert:
// black outline, one bright warm mass (the wheels), one cool mass (the
// rider), white for the helmet that carries the pose.
export const COLORS = [C.BLUE, C.BLACK, C.WHITE, C.LIGHTRED, C.ORANGE];
const B = 1, K = 2, Wt = 3, R = 4, Sk = 5;

const CX = S / 2; // 28
const AXLE_Y = S / 2; // axle line row
const REAR = [CX - AXLE_DX, AXLE_Y];
const FRONT = [CX + AXLE_DX, AXLE_Y];
const BB = [CX, AXLE_Y - 1]; // bottom bracket
const HAND = [CX + 3, AXLE_Y - 14];

const mk = () => Array.from({ length: S }, () => new Uint8Array(S));

const px = (g, x, y, c) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && x < S && y >= 0 && y < S) g[y][x] = c;
};

// line in visual space: x in fat px (2 wide), y in rows (1 tall).
// `thick` widens across the line's dominant axis, so a stroke stays the
// same weight whether it runs horizontally or vertically.
const line = (g, x0, y0, x1, y1, c, thick = 1) => {
  const steps = Math.max(Math.abs((x1 - x0) * 2), Math.abs(y1 - y0), 1) * 2;
  const steep = Math.abs(y1 - y0) > Math.abs((x1 - x0) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    for (let t = 0; t < thick; t += 1) {
      if (steep) px(g, x + t, y, c);
      else px(g, x, y + t, c);
    }
  }
};

const ellipse = (g, cx, cy, rx, ry, c) => {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.3);
    for (let dx = -w; dx <= w; dx += 1) px(g, cx + dx, cy + dy, c);
  }
};

// wheel like the sheet: fat black tyre, bright disc, blue Y-spokes, hub
const wheel = (g, cx, cy) => {
  ellipse(g, cx, cy, 4, WHEEL_R, K);
  ellipse(g, cx, cy, 3, WHEEL_R - 2, R);
  line(g, cx, cy - 5, cx, cy, B, 1);
  line(g, cx, cy, cx - 2, cy + 4, B, 1);
  line(g, cx, cy, cx + 2, cy + 4, B, 1);
  px(g, cx, cy, K);
  px(g, cx, cy - 1, K);
};

const bikeFrame = (g) => {
  wheel(g, REAR[0], REAR[1]);
  wheel(g, FRONT[0], FRONT[1]);
  const seat = [CX - 3, AXLE_Y - 9];
  const headTube = [CX + 5, AXLE_Y - 8];
  line(g, REAR[0], REAR[1], BB[0], BB[1], B, 2); // chainstay
  line(g, BB[0], BB[1], seat[0], seat[1], B, 2); // seat tube
  line(g, seat[0], seat[1], headTube[0], headTube[1], B, 2); // top tube
  line(g, BB[0], BB[1], headTube[0] - 1, headTube[1] + 2, B, 2); // down tube
  line(g, headTube[0], headTube[1], FRONT[0], FRONT[1], B, 2); // fork
  line(g, headTube[0], headTube[1], headTube[0], headTube[1] - 5, B, 1); // stem
  line(g, headTube[0], headTube[1] - 5, HAND[0], HAND[1], B, 1); // bars
  line(g, seat[0] - 1, seat[1] - 1, seat[0] + 1, seat[1] - 1, K, 2); // seat
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

// leg with a forward knee bend, white pants, blue shoe
const leg = (g, hip, foot, shade) => {
  const kx = (hip[0] + foot[0]) / 2 + 1.5;
  const ky = (hip[1] + foot[1]) / 2;
  line(g, hip[0], hip[1], kx, ky, shade, 2);
  line(g, kx, ky, foot[0], foot[1], shade, 2);
  px(g, foot[0], foot[1], B);
  px(g, foot[0] + 1, foot[1], B);
};

const rider = (g, pose, feet) => {
  const { hip, sh, head } = pose;
  const hand = pose.hand || HAND;
  leg(g, [hip[0] - 1, hip[1]], feet[1], B); // back leg, in shadow
  // torso: a solid blue jersey block with a white stripe down it
  line(g, hip[0], hip[1], sh[0], sh[1], B, 3);
  line(g, hip[0] + 1, hip[1] - 1, sh[0] + 1, sh[1] + 1, Wt, 1);
  line(g, sh[0], sh[1], hand[0], hand[1], Wt, 2); // arm, white sleeve
  px(g, hand[0], hand[1], Sk); // hand
  // helmet: white shell with a black brim, skin below it
  ellipse(g, head[0], head[1], 2, 3, Wt);
  px(g, head[0] + 2, head[1], K);
  px(g, head[0] + 1, head[1] + 2, Sk);
  px(g, head[0] + 2, head[1] + 2, Sk);
  leg(g, hip, feet[0], Wt); // front leg on top, lit
};

// Upright on the pedals, as in the sheet: rider plus bike measures
// about 46x36 fat-pixel-doubled pixels, roughly a seventh of the
// 320-wide screen, which is what makes the desert feel big.
const RIDE = { hip: [CX - 3, AXLE_Y - 11], sh: [CX + 2, AXLE_Y - 20], head: [CX + 4, AXLE_Y - 24] };

const POSE_DEF = {
  coast: { ...RIDE, phi: 0 },
  pedal0: { ...RIDE, phi: 0.6 },
  pedal1: { ...RIDE, phi: 2.17 },
  pedal2: { ...RIDE, phi: 3.74 },
  pedal3: { ...RIDE, phi: 5.31 },
  crouch: { hip: [CX - 2, AXLE_Y - 8], sh: [CX + 3, AXLE_Y - 15], head: [CX + 5, AXLE_Y - 19], phi: 0 },
  air: { hip: [CX - 2, AXLE_Y - 9], sh: [CX + 3, AXLE_Y - 17], head: [CX + 5, AXLE_Y - 21], phi: 0 },
};

const toStrings = (g) =>
  g.map((row) => Array.from(row, (v) => (v ? String(v) : '.')).join(''));

const buildPose = (def) => {
  const g = mk();
  bikeFrame(g);
  const feet = cranks(g, def.phi);
  rider(g, def, feet);
  return rotationFrames(toStrings(g), N_ROT, S);
};

export const POSES = {};
for (const [name, def] of Object.entries(POSE_DEF)) POSES[name] = buildPose(def);

// riderless bike, for the crash tumble
const bikeOnly = () => {
  const g = mk();
  bikeFrame(g);
  cranks(g, 0.8);
  return rotationFrames(toStrings(g), N_ROT, S);
};
export const BIKE_ROT = bikeOnly();

// ---- crash frames: the same rider, without the bike under him ----
//
// Built from the same routine as the ridden poses so the separated
// rider stays exactly the scale he was a moment earlier. Feet rest on
// grid row FOOT_Y, which the game aligns to the ground contact.

export const FOOT_Y = AXLE_Y + WHEEL_R;

const buildRiderOnly = (def) => {
  const g = mk();
  rider(g, def, def.feet);
  return toStrings(g);
};

// tumbling ball, pre-rotated so he spins with the bike
export const TUMBLE_ROT = rotationFrames(
  buildRiderOnly({
    hip: [CX - 1, AXLE_Y + 2],
    sh: [CX + 3, AXLE_Y - 4],
    head: [CX + 5, AXLE_Y - 7],
    hand: [CX + 7, AXLE_Y - 1],
    feet: [[CX - 7, AXLE_Y + 5], [CX - 6, AXLE_Y + 8]],
  }),
  N_ROT,
  S,
);

// sitting in the dirt, legs out in front
export const SIT = buildRiderOnly({
  hip: [CX - 3, FOOT_Y - 3],
  sh: [CX - 5, FOOT_Y - 11],
  head: [CX - 4, FOOT_Y - 15],
  hand: [CX + 2, FOOT_Y - 4],
  feet: [[CX + 6, FOOT_Y], [CX + 5, FOOT_Y - 1]],
});

// back on his feet, reaching for the bike
export const GETUP = buildRiderOnly({
  hip: [CX - 1, FOOT_Y - 9],
  sh: [CX, FOOT_Y - 17],
  head: [CX + 1, FOOT_Y - 21],
  hand: [CX + 6, FOOT_Y - 13],
  feet: [[CX + 1, FOOT_Y], [CX - 3, FOOT_Y]],
});
