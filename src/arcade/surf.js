// SURF on the VIC engine: 160x200 multicolor, sprite surfer, real
// attribute constraints. Ride the pocket, dodge the foam, 60 seconds.

import { W, H, C, rotationFrames } from './engine.js';

const SESSION = 60;
const PX_MIN = 14;
const PX_MAX = 124;

// Crest line: high on the right, sloping down-left toward the beach.
const crestY = (x, t) => 42 + (W - x) * 0.64 + Math.sin(t * 0.8 + x * 0.04) * 4;

// hardware sprite: 1=wetsuit black, 2=skin orange, 3=board yellow
const SURFER = [
  '.....11.....',
  '.....22.....',
  '....1111....',
  '.221111122..',
  '....1111....',
  '....1111....',
  '.....11.....',
  '....2.22....',
  '....2..2....',
  '...22..22...',
  '...2....2...',
  '333333333333',
  '.3333333333.',
];
const SURFER_COLORS = [C.BLACK, C.ORANGE, C.YELLOW];
const TUMBLE = rotationFrames(SURFER, 8, 18);

const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function createSurf({ keys, end }) {
  const g = {
    t: 0,
    score: 0,
    boards: 3,
    px: 64,
    py: crestY(64, 0) + 16,
    vx: 0,
    vy: 0,
    tumble: 0,
    bogTimer: 0,
    foam: null,
    nextFoam: 4,
    popup: null,
    spray: [],
  };

  const wipeout = (reason) => {
    g.boards -= 1;
    g.tumble = 1.3;
    g.popup = { text: reason, ttl: 1.6 };
    if (g.boards <= 0) {
      setTimeout(() => end({ score: Math.round(g.score), wiped: true }), 900);
    }
  };

  const update = (dt) => {
    g.t += dt;
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;

    for (const p of g.spray) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;
    }
    g.spray = g.spray.filter((p) => p.ttl > 0);

    if (g.t >= SESSION) {
      end({ score: Math.round(g.score) });
      return;
    }

    if (g.tumble > 0) {
      g.tumble -= dt;
      if (g.tumble <= 0) {
        g.py = crestY(g.px, g.t) + 24;
        g.bogTimer = 0;
      }
      return;
    }

    // steering
    g.vx = (keys.has('ArrowRight') ? 36 : 0) - (keys.has('ArrowLeft') ? 36 : 0);
    g.vy = (keys.has('ArrowDown') ? 74 : 0) - (keys.has('ArrowUp') ? 74 : 0);
    g.px += g.vx * dt;
    g.py += g.vy * dt;
    // the face pushes you down and toward the beach
    g.py += 15 * dt;
    g.px -= 3.5 * dt;
    g.px = Math.max(PX_MIN, Math.min(PX_MAX, g.px));

    if (Math.abs(g.vx) + Math.abs(g.vy) > 10 || Math.random() < 0.4) {
      g.spray.push({
        x: g.px - 5 + Math.random() * 3,
        y: g.py + 5 + Math.random() * 3,
        vx: -16 - Math.random() * 14,
        vy: 10 + Math.random() * 20,
        ttl: 0.5 + Math.random() * 0.4,
      });
    }

    const crest = crestY(g.px, g.t);
    const depth = g.py - crest;

    if (depth < 2) {
      wipeout('OVER THE FALLS!');
      return;
    }
    if (g.py > H - 24) g.py = H - 24;

    if (depth >= 4 && depth <= 28) {
      g.score += (48 - depth) * dt * 2.2;
      g.bogTimer = 0;
    } else if (depth > 58) {
      g.bogTimer += dt;
      if (g.bogTimer > 1.6) {
        wipeout('BOGGED IN THE FLATS!');
        return;
      }
    } else {
      g.bogTimer = 0;
    }

    // rolling foam sections
    g.nextFoam -= dt;
    if (!g.foam && g.nextFoam <= 0) {
      const fx = Math.min(PX_MAX, Math.max(30, g.px + (Math.random() * 46 - 15)));
      g.foam = { x: fx, y: crestY(fx, g.t) - 4, r: 6, vy: 48 };
      g.nextFoam = 5 + Math.random() * 5;
    }
    if (g.foam) {
      g.foam.y += g.foam.vy * dt;
      g.foam.x -= 7 * dt;
      g.foam.r += 1.6 * dt;
      if (g.foam.y > H + 12) g.foam = null;
      else {
        const dx = g.foam.x - g.px;
        const dy = (g.foam.y - g.py) * 0.7;
        if (dx * dx + dy * dy < (g.foam.r + 4) ** 2) {
          g.foam = null;
          wipeout('MOWED BY THE FOAM!');
        }
      }
    }
  };

  const draw = (vic) => {
    vic.border = C.CYAN;
    vic.bg = C.BLUE;
    vic.clear(C.CYAN);

    const frame = Math.floor(g.t * 3);

    // wave, column by column: jagged foam crest, lit face, deep water
    for (let x = 0; x < W; x += 1) {
      const c = crestY(x, g.t) | 0;
      const foamH = 2 + hash(x * 7.3 + frame) * 4;
      vic.col(x, c - 1, c + foamH, C.WHITE);
      vic.col(x, c + foamH, c + foamH + 12, C.LIGHTBLUE);
      vic.col(x, c + foamH + 12, H, C.BLUE);
      // deep water shadow band, dithered like the era did gradients
      const deep = Math.max(c + 24, H - 30);
      for (let y = deep + ((x & 1) ? 1 : 0); y < H; y += 2) vic.pset(x, y, C.DARKGREY);
    }

    // ocean speckle
    for (let i = 0; i < 240; i += 1) {
      const sx = Math.floor(hash(i * 13.7) * W);
      const sy = Math.floor(hash(i * 71.3) * H);
      if (sy > crestY(sx, g.t) + 9 && hash(i + frame) > 0.35) vic.pset(sx, sy, C.WHITE);
    }

    // curl ball riding the crest on the right
    const cx = 130 + Math.sin(g.t * 1.7) * 8;
    const cy = crestY(cx, g.t) - 2;
    vic.circle(cx, cy, 7, C.WHITE);
    for (let i = 0; i < 16; i += 1) {
      vic.pset(cx - 7 + hash(i * 3.1 + frame) * 14, cy - 6 + hash(i * 9.7) * 11, C.CYAN);
    }

    // rolling foam section
    if (g.foam) {
      vic.circle(g.foam.x, g.foam.y, g.foam.r, C.WHITE);
      for (let i = 0; i < 10; i += 1) {
        vic.pset(
          g.foam.x - g.foam.r + hash(i * 5.3 + frame) * g.foam.r * 2,
          g.foam.y - g.foam.r + hash(i * 8.9) * g.foam.r * 2,
          C.LIGHTBLUE,
        );
      }
    }

    // spray trail (bitmap layer, clashes like the real thing)
    for (const p of g.spray) vic.pset(p.x, p.y, C.WHITE);

    // surfer sprite (hardware layer, exempt from cell limits)
    if (g.tumble > 0) {
      const f = TUMBLE[Math.floor((1.3 - g.tumble) * 12) % TUMBLE.length];
      vic.sprite(f, g.px - 9, g.py - 12, SURFER_COLORS);
    } else {
      vic.sprite(SURFER, g.px - 6, g.py - 11, SURFER_COLORS);
    }

    const pc = crestY(g.px, g.t);
    if (g.py - pc > 32 && g.tumble <= 0) vic.text('POCKET UP', g.px - 22, pc + 8, C.YELLOW);
    if (g.bogTimer > 0.5) vic.text('PADDLE UP!', g.px - 24, g.py - 22, C.LIGHTRED);
    if (g.popup) vic.text(g.popup.text, W / 2 - vic.textWidth(g.popup.text) / 2, 44, C.LIGHTRED);

    // HUD
    const left = Math.max(0, SESSION - g.t);
    const mm = Math.floor(left / 60);
    const ss = String(Math.floor(left % 60)).padStart(2, '0');
    vic.hudBox(`SURF ${mm}:${ss}`, 30);
    const sc = `${Math.round(g.score)}`;
    vic.text(sc, W - vic.textWidth(sc) - 4, 5, C.WHITE);
    for (let i = 0; i < g.boards; i += 1) {
      vic.orect(W - 10 - i * 8, 14, 6, 2, C.YELLOW);
    }
    vic.statusBar('CONTESTANT FRANCIS', 'ESC');
  };

  return { update, draw, score: () => Math.round(g.score) };
}
