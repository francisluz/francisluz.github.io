// BMX — side-scrolling dirt track. Jump the rocks, rotate in the air
// for backflip points, land close to the slope or eat dirt. 3 crashes.

import { W, H, C64, skyBands, hudText, dither } from './engine.js';

const PX = 70; // rider's fixed screen x
const GRAVITY = 240;
const JUMP_V = -105;
const FINISH_M = 1000;
const PX_PER_M = 8;

const groundY = (wx) =>
  H - 42 + Math.sin(wx * 0.018) * 13 + Math.sin(wx * 0.047 + 1.7) * 7;

const slopeAngle = (wx) => {
  const d = (groundY(wx + 4) - groundY(wx - 4)) / 8;
  return Math.atan(d);
};

export function createBmx({ keys, end }) {
  const g = {
    wx: 0,
    speed: 78,
    py: groundY(PX),
    vy: 0,
    air: false,
    ang: 0,
    spin: 0, // accumulated rotation this jump
    lives: 3,
    tricks: 0,
    crashT: 0,
    popup: null,
    obstacles: [],
    nextObs: 260,
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
    g.speed = 78;
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

    g.speed = Math.min(126, g.speed + 3.5 * dt);
    g.wx += g.speed * dt;

    const dist = g.wx / PX_PER_M;
    if (dist >= FINISH_M) {
      end({ score: score(), dist: FINISH_M, finished: true });
      return;
    }

    // spawn obstacles ahead of the view
    if (g.wx + W > g.nextObs) {
      g.obstacles.push({ x: g.nextObs + W, w: 9, h: 7 });
      g.nextObs += 150 + Math.random() * 220;
    }
    g.obstacles = g.obstacles.filter((o) => o.x > g.wx - 40);

    const wpx = g.wx + PX;
    const gy = groundY(wpx);

    if (!g.air) {
      g.py = gy;
      g.ang = slopeAngle(wpx);
      const jump = keys.has('ArrowUp') || keys.has(' ');
      if (jump && !g.jumpHeld) {
        g.air = true;
        g.vy = JUMP_V - g.speed * 0.12;
        g.spin = 0;
      }
      g.jumpHeld = jump;
      // rock collision on the ground
      for (const o of g.obstacles) {
        if (Math.abs(o.x - wpx) < o.w) {
          crash('ROCKED!');
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
        // compare landing angle with slope, mod full turns
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
          g.popup = { text: `${g.spin < 0 ? 'BACK' : 'FRONT'}FLIP X${flips}! +${pts}`, ttl: 1.6 };
        }
        g.ang = target;
        g.spin = 0;
      }
    }
  };

  const drawBike = (ctx) => {
    ctx.save();
    ctx.translate(PX, g.py - 6);
    ctx.rotate(g.crashT > 0 ? g.crashT * 10 : g.ang);
    ctx.fillStyle = C64.black; // wheels
    ctx.beginPath();
    ctx.arc(-6, 4, 3.5, 0, Math.PI * 2);
    ctx.arc(6, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C64.lightred; // frame
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(0, 0);
    ctx.lineTo(6, 4);
    ctx.moveTo(0, 0);
    ctx.lineTo(4, -2);
    ctx.stroke();
    ctx.fillStyle = C64.blue; // rider
    ctx.fillRect(-2, -7, 4, 6);
    ctx.fillStyle = C64.orange; // head
    ctx.fillRect(-1, -11, 3, 4);
    ctx.restore();
  };

  const draw = (ctx) => {
    skyBands(ctx, H - 60);

    // distant hills
    ctx.fillStyle = C64.green;
    for (let x = 0; x < W; x += 1) {
      const hy = H - 58 + Math.sin((x + g.wx * 0.3) * 0.02) * 6;
      ctx.fillRect(x, hy, 1, 16);
    }

    // dirt track
    for (let x = 0; x < W; x += 1) {
      const gy = groundY(g.wx + x);
      ctx.fillStyle = C64.lightgreen;
      ctx.fillRect(x, gy - 4, 1, 2);
      ctx.fillStyle = C64.brown;
      ctx.fillRect(x, gy - 2, 1, H - gy + 2);
    }
    dither(ctx, 0, H - 40, W, 40, C64.orange, 0.15, (g.wx | 0) % 7);

    // obstacles
    for (const o of g.obstacles) {
      const sx = o.x - g.wx;
      if (sx < -20 || sx > W + 20) continue;
      const gy = groundY(o.x);
      ctx.fillStyle = C64.darkgrey;
      ctx.fillRect(sx - o.w / 2, gy - o.h, o.w, o.h);
      ctx.fillStyle = C64.lightgrey;
      ctx.fillRect(sx - o.w / 2 + 1, gy - o.h + 1, 3, 2);
    }

    // finish flag
    const fx = FINISH_M * PX_PER_M - g.wx + PX;
    if (fx < W + 20) {
      const gy = groundY(FINISH_M * PX_PER_M + PX);
      ctx.fillStyle = C64.white;
      ctx.fillRect(fx, gy - 34, 2, 34);
      ctx.fillStyle = C64.red;
      ctx.fillRect(fx + 2, gy - 34, 12, 8);
    }

    drawBike(ctx);

    // HUD
    hudText(ctx, `SCORE ${score()}`, 6, 5);
    hudText(ctx, `${Math.min(FINISH_M, Math.round(g.wx / PX_PER_M))}M / ${FINISH_M}M`, 6, 16, C64.yellow);
    hudText(ctx, `BIKES ${'#'.repeat(Math.max(0, g.lives))}`, W - 70, 5, C64.yellow);
    if (g.popup) hudText(ctx, g.popup.text, W / 2 - 54, 52, C64.lightgreen);
    hudText(ctx, 'UP JUMPS · L/R FLIPS · ESC QUITS', 6, H - 12, C64.lightgrey);
  };

  return { update, draw, score };
}
