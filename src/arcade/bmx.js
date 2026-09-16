// BMX on the VIC engine: desert track, corduroy dirt, sprite rider
// built from two overlaid hardware sprites with pre-rendered rotation
// frames (the chip could not rotate sprites; games shipped frames).

import { W, H, C, rotationFrames } from './engine.js';

const PX = 35;
const GRAVITY = 240;
const JUMP_V = -105;
const FINISH_M = 1000;
const PX_PER_M = 4;
const HORIZON = 48;

const groundY = (wx) =>
  H - 46 + Math.sin(wx * 0.036) * 13 + Math.sin(wx * 0.094 + 1.7) * 7;

const slopeAngle = (wx) => {
  const d = (groundY(wx + 2) - groundY(wx - 2)) / 4;
  return Math.atan(d / 2); // fat pixels are 2x wide in visual space
};

// bike sprite: 1=red frame, 2=black tire, 3=grey rim
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
  '.23332....23332.',
  '..222......222..',
  '................',
  '................',
  '................',
];

// rider sprite: 1=white kit, 2=skin, 3=blue pants
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

const BIKE_COLORS = [C.RED, C.BLACK, C.LIGHTGREY];
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

  const draw = (vic) => {
    vic.border = C.BROWN;
    vic.bg = C.ORANGE;
    vic.clear(C.CYAN);

    // rocky ridge on the horizon
    for (let x = 0; x < W; x += 1) {
      const r = 34 - hash(Math.floor((g.wx * 0.2 + x) / 2)) * 7;
      vic.col(x, r, r + 2, C.BROWN);
      vic.col(x, r + 2, HORIZON, C.ORANGE);
      vic.col(x, HORIZON - 2, HORIZON, C.BROWN);
    }

    // field + corduroy dirt, column by column
    for (let x = 0; x < W; x += 1) {
      const wxc = g.wx + x;
      const gy = groundY(wxc) | 0;
      vic.col(x, HORIZON, gy - 1, C.YELLOW);
      vic.pset(x, gy - 1, C.BROWN);
      const stripe = Math.floor(wxc / 2) % 2 === 0;
      vic.col(x, gy, H, stripe ? C.ORANGE : C.RED);
    }

    // fallen leaves on the field
    for (let i = 0; i < 60; i += 1) {
      const sx = Math.floor(hash(i * 23.7) * W);
      const sy = HORIZON + Math.floor(hash(i * 51.1) * 70);
      if (sy < groundY(g.wx + sx) - 3) vic.pset(sx, sy, i % 3 === 0 ? C.RED : C.LIGHTGREEN);
    }

    // trees, light parallax
    const span = W + 40;
    for (let i = 0; i < 4; i += 1) {
      const sx = Math.floor(((((i * 130 - g.wx * 0.6) % span) + span) % span) - 20);
      const ty = 62 + hash(i * 11.3) * 40;
      vic.rect(sx, ty, 2, 7, C.BROWN);
      vic.rect(sx - 3, ty - 6, 8, 6, C.GREEN);
      vic.rect(sx - 1, ty - 9, 4, 4, C.GREEN);
      vic.rect(sx - 2, ty - 7, 3, 2, C.LIGHTGREEN);
    }

    // spectators near the track
    const SHIRTS = [C.BLUE, C.RED, C.WHITE];
    for (let i = 0; i < 3; i += 1) {
      const sx = Math.floor(((((i * 210 + 100 - g.wx) % (W + 100)) + (W + 100)) % (W + 100)) - 30);
      if (sx < -6 || sx > W + 6) continue;
      const sy = (groundY(g.wx + sx) | 0) - 1;
      vic.rect(sx, sy - 4, 1, 4, C.BLACK);
      vic.rect(sx + 2, sy - 4, 1, 4, C.BLACK);
      vic.rect(sx - 1, sy - 9, 5, 5, SHIRTS[i % 3]);
      vic.rect(sx, sy - 12, 3, 3, C.ORANGE);
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

    // HUD
    vic.hudBox(`BMX ${Math.min(FINISH_M, Math.round(g.wx / PX_PER_M))}M`, W / 2);
    for (let i = 0; i < g.lives; i += 1) {
      vic.orect(W - 9 - i * 8, 5, 6, 1, C.RED);
      vic.opset(W - 9 - i * 8, 7, C.BLACK);
      vic.opset(W - 5 - i * 8, 7, C.BLACK);
    }
    vic.statusBar('UP JUMP · L/R FLIP', `${score()}`);
  };

  return { update, draw, score };
}
