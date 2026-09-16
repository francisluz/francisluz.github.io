// BMX on the VIC engine: log-fence dirt track cut into a desert,
// saguaros, debris, spectators. Sprite rider from two overlaid
// hardware sprites with pre-rendered rotation frames.

import { W, H, C, rotationFrames } from './engine.js';

const PX = 35;
const GRAVITY = 240;
const JUMP_V = -105;
const FINISH_M = 1000;
const PX_PER_M = 4;
const HORIZON = 38;

const groundY = (wx) =>
  H - 46 + Math.sin(wx * 0.036) * 13 + Math.sin(wx * 0.094 + 1.7) * 7;

const slopeAngle = (wx) => {
  const d = (groundY(wx + 2) - groundY(wx - 2)) / 4;
  return Math.atan(d / 2); // fat pixels are 2x wide in visual space
};

// bike: 1=blue frame, 2=black tire, 3=white rim/disc
const BIKE = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....11.....1....',
  '....111111111...',
  '....1.1111.1....',
  '..222.1..1.222..',
  '.23332.11.23332.',
  '.23132....23132.',
  '..222......222..',
  '................',
  '................',
  '................',
];

// rider: 1=white kit+helmet, 2=skin, 3=blue pants
const RIDER = [
  '................',
  '................',
  '................',
  '................',
  '......111.......',
  '......111.......',
  '......22........',
  '.....1111.......',
  '.....11111......',
  '.....111.22.....',
  '.....333........',
  '.....333........',
  '....33.33.......',
  '....3...3.......',
  '....2...2.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const BIKE_COLORS = [C.BLUE, C.BLACK, C.WHITE];
const RIDER_COLORS = [C.WHITE, C.ORANGE, C.BLUE];
const N_FRAMES = 16;
const BIKE_F = rotationFrames(BIKE, N_FRAMES, 26);
const RIDER_F = rotationFrames(RIDER, N_FRAMES, 26);

const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function createBmx({ keys, end }) {
  const g = {
    wx: 0,
    speed: 39,
    py: groundY(PX),
    vy: 0,
    air: false,
    ang: 0,
    spin: 0,
    lives: 3,
    tricks: 0,
    crashT: 0,
    popup: null,
    obstacles: [],
    nextObs: 130,
    jumpHeld: false,
  };

  const score = () => Math.round((g.wx / PX_PER_M) * 2 + g.tricks);

  const crash = (reason) => {
    g.lives -= 1;
    g.crashT = 1.4;
    g.popup = { text: reason, ttl: 1.8 };
    g.air = false;
    g.ang = 0;
    g.spin = 0;
    g.speed = 39;
    if (g.lives <= 0) {
      setTimeout(() => end({ score: score(), dist: Math.round(g.wx / PX_PER_M), wiped: true }), 900);
    }
  };

  const update = (dt) => {
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;
    if (g.crashT > 0) {
      g.crashT -= dt;
      return;
    }

    g.speed = Math.min(63, g.speed + 1.75 * dt);
    g.wx += g.speed * dt;

    const dist = g.wx / PX_PER_M;
    if (dist >= FINISH_M) {
      end({ score: score(), dist: FINISH_M, finished: true });
      return;
    }

    if (g.wx + W > g.nextObs) {
      g.obstacles.push({ x: g.nextObs + W, w: 5, h: 7, weed: hash(g.nextObs) > 0.5 });
      g.nextObs += 75 + Math.random() * 110;
    }
    g.obstacles = g.obstacles.filter((o) => o.x > g.wx - 20);

    const wpx = g.wx + PX;
    const gy = groundY(wpx);

    if (!g.air) {
      g.py = gy;
      g.ang = slopeAngle(wpx);
      const jump = keys.has('ArrowUp') || keys.has(' ');
      if (jump && !g.jumpHeld) {
        g.air = true;
        g.vy = JUMP_V - g.speed * 0.24;
        g.spin = 0;
      }
      g.jumpHeld = jump;
      for (const o of g.obstacles) {
        if (Math.abs(o.x - wpx) < o.w) {
          crash(o.weed ? 'TUMBLEWEEDED!' : 'ROCKED!');
          return;
        }
      }
    } else {
      g.vy += GRAVITY * dt;
      g.py += g.vy * dt;
      const rot = 8.2 * dt;
      if (keys.has('ArrowLeft')) {
        g.ang -= rot;
        g.spin -= rot;
      }
      if (keys.has('ArrowRight')) {
        g.ang += rot;
        g.spin += rot;
      }
      if (g.py >= gy) {
        g.py = gy;
        g.air = false;
        const target = slopeAngle(wpx);
        let diff = (g.ang - target) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 0.95) {
          crash('CASED IT!');
          return;
        }
        const flips = Math.floor(Math.abs(g.spin) / (Math.PI * 2));
        if (flips > 0) {
          const pts = flips * 250;
          g.tricks += pts;
          g.popup = { text: `${g.spin < 0 ? 'BACK' : 'FRONT'}FLIP X${flips} +${pts}`, ttl: 1.6 };
        }
        g.ang = target;
        g.spin = 0;
      }
    }
  };

  // saguaro cactus with two arms
  const drawCactus = (vic, x, y, h) => {
    vic.rect(x, y - h, 2, h, C.GREEN);
    vic.col(x, y - h, y, C.LIGHTGREEN);
    // left arm: out then up
    vic.rect(x - 3, y - h + 5, 3, 2, C.GREEN);
    vic.rect(x - 3, y - h + 2, 1, 4, C.GREEN);
    vic.pset(x - 3, y - h + 2, C.LIGHTGREEN);
    // right arm, lower
    vic.rect(x + 2, y - h + 8, 3, 2, C.GREEN);
    vic.rect(x + 4, y - h + 5, 1, 4, C.GREEN);
  };

  const draw = (vic) => {
    vic.border = C.BROWN;
    vic.bg = C.ORANGE;
    vic.clear(C.LIGHTBLUE);

    // jagged black rock silhouette on the horizon
    for (let x = 0; x < W; x += 1) {
      const r = 28 - hash(Math.floor((g.wx * 0.15 + x) / 2)) * 6;
      vic.col(x, r, r + 4, C.BLACK);
      vic.col(x, r + 4, HORIZON, C.DARKGREY);
    }

    // sandy field + log-fence track, column by column
    for (let x = 0; x < W; x += 1) {
      const wxc = g.wx + x;
      const gy = groundY(wxc) | 0;
      const d = (groundY(wxc + 2) - groundY(wxc - 2)) / 4;
      const shadowed = d > 0.55; // steep downhill face sits in shadow

      vic.col(x, HORIZON, gy - 1, C.YELLOW);

      // vertical logs, 2 fat px wide: lit column + shaded column,
      // dark rounded cap, whole face darker inside gullies
      const lit = Math.floor(wxc / 2) % 2 === 0;
      vic.pset(x, gy - 1, shadowed ? C.BLACK : C.BROWN); // cap
      const body = shadowed ? (lit ? C.BROWN : C.RED) : lit ? C.ORANGE : C.RED;
      vic.col(x, gy, H, body);
      // seam between logs every 2nd column
      if (!lit) {
        for (let y = gy + ((x & 1) << 1); y < H; y += 4) vic.pset(x, y, C.BROWN);
      }
    }

    // field debris: rocks, orange scrub, dry bushes (world-anchored)
    const k0 = Math.floor(g.wx / 14) - 1;
    for (let k = k0; k < k0 + Math.ceil(W / 14) + 2; k += 1) {
      const sx = Math.floor(k * 14 - g.wx + hash(k) * 10);
      if (sx < -4 || sx > W + 4) continue;
      const sy = HORIZON + 4 + Math.floor(hash(k * 3.7) * 100);
      if (sy > groundY(g.wx + sx) - 8) continue;
      const kind = hash(k * 9.1);
      if (kind < 0.4) {
        vic.rect(sx, sy, 2, 1, C.ORANGE);
        vic.pset(sx + 2, sy - 1, C.ORANGE);
      } else if (kind < 0.7) {
        vic.rect(sx, sy, 2, 1, C.GREY);
        vic.pset(sx + 1, sy - 1, C.LIGHTGREY);
      } else {
        vic.pset(sx, sy, C.BROWN);
        vic.pset(sx + 1, sy - 1, C.BROWN);
        vic.pset(sx + 2, sy, C.BROWN);
      }
    }

    // saguaros, light parallax
    const span = W + 60;
    for (let i = 0; i < 3; i += 1) {
      const sx = Math.floor(((((i * 170 - g.wx * 0.7) % span) + span) % span) - 30);
      const ty = 66 + hash(i * 11.3) * 36;
      if (ty < groundY(g.wx + sx) - 4) drawCactus(vic, sx, ty, 12 + Math.floor(hash(i * 5.1) * 5));
    }

    // spectators standing behind the log wall
    const SHIRTS = [C.BLUE, C.RED, C.WHITE];
    for (let i = 0; i < 3; i += 1) {
      const sx = Math.floor(((((i * 210 + 100 - g.wx) % (W + 100)) + (W + 100)) % (W + 100)) - 30);
      if (sx < -6 || sx > W + 6) continue;
      const sy = (groundY(g.wx + sx) | 0) - 1;
      vic.rect(sx - 1, sy - 8, 5, 5, SHIRTS[i % 3]);
      vic.rect(sx, sy - 11, 3, 3, C.ORANGE);
    }

    // obstacles
    for (const o of g.obstacles) {
      const sx = o.x - g.wx;
      if (sx < -10 || sx > W + 10) continue;
      const gy = groundY(o.x);
      if (o.weed) {
        vic.circle(sx, gy - 3, 3, C.GREEN);
        vic.pset(sx - 1, gy - 5, C.LIGHTGREEN);
        vic.pset(sx + 1, gy - 3, C.LIGHTGREEN);
      } else {
        vic.rect(sx - 2, gy - o.h, o.w, o.h, C.DARKGREY);
        vic.rect(sx - 1, gy - o.h + 1, 2, 2, C.LIGHTGREY);
      }
    }

    // finish flag
    const fx = FINISH_M * PX_PER_M - g.wx + PX;
    if (fx < W + 10) {
      const gy = groundY(FINISH_M * PX_PER_M + PX);
      vic.rect(fx, gy - 30, 1, 30, C.WHITE);
      vic.rect(fx + 1, gy - 30, 7, 6, C.RED);
    }

    // rider: two overlaid sprites, stepped rotation frames
    const ang = g.crashT > 0 ? g.crashT * 10 : g.ang;
    const fi = ((Math.round((ang / (Math.PI * 2)) * N_FRAMES) % N_FRAMES) + N_FRAMES) % N_FRAMES;
    const sx = PX - 13;
    const sy = g.py - 20;
    vic.sprite(BIKE_F[fi], sx, sy, BIKE_COLORS);
    vic.sprite(RIDER_F[fi], sx, sy, RIDER_COLORS);

    if (g.popup) vic.text(g.popup.text, W / 2 - vic.textWidth(g.popup.text) / 2, 54, C.WHITE);

    // HUD: paired Casio boxes, yellow digits in the bottom bar
    vic.hudBox('BMX', W / 2 - 22);
    vic.hudBox(`${Math.min(FINISH_M, Math.round(g.wx / PX_PER_M))}M`, W / 2 + 18);
    for (let i = 0; i < g.lives; i += 1) {
      vic.orect(W - 9 - i * 8, 5, 6, 1, C.RED);
      vic.opset(W - 9 - i * 8, 7, C.BLACK);
      vic.opset(W - 5 - i * 8, 7, C.BLACK);
    }
    vic.orect(0, H - 10, W, 10, C.BLACK);
    vic.text(`${Math.round(g.speed)}`, 3, H - 8, C.YELLOW);
    const sc = `${score()}`;
    vic.text(sc, W - vic.textWidth(sc) - 3, H - 8, C.YELLOW);
  };

  return { update, draw, score };
}
