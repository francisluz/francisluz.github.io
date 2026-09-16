// BMX — side-scrolling dirt track. Jump the rocks and tumbleweeds,
// rotate in the air for flip points, land close to the slope. 3 bikes.
// Look modeled on late-80s EGA BMX games: warm desert palette, rocky
// ridge horizon, corduroy dirt, trees and spectators along the track.

import { W, H, C64, hudText, hudBox, statusBar, hash } from './engine.js';

const SKY = '#4fc8dc';
const RIDGE = '#6b4a1c';
const RIDGE_DARK = '#3f2a0e';
const FIELD = '#cdb944';
const FIELD_LIGHT = '#dccd66';
const DIRT = '#c14a1a';
const DIRT_DARK = '#8f3110';
const DIRT_LINE = '#5e1f08';

const PX = 70;
const GRAVITY = 240;
const JUMP_V = -105;
const FINISH_M = 1000;
const PX_PER_M = 8;
const HORIZON = 40;

const groundY = (wx) =>
  H - 46 + Math.sin(wx * 0.018) * 13 + Math.sin(wx * 0.047 + 1.7) * 7;

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
    spin: 0,
    lives: 3,
    tricks: 0,
    crashT: 0,
    popup: null,
    obstacles: [],
    nextObs: 260,
    jumpHeld: false,
    pedal: 0,
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
    g.pedal += g.speed * dt * 0.15;

    const dist = g.wx / PX_PER_M;
    if (dist >= FINISH_M) {
      end({ score: score(), dist: FINISH_M, finished: true });
      return;
    }

    if (g.wx + W > g.nextObs) {
      g.obstacles.push({
        x: g.nextObs + W,
        w: 9,
        h: 7,
        weed: hash(g.nextObs) > 0.5,
      });
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
          g.popup = { text: `${g.spin < 0 ? 'BACK' : 'FRONT'}FLIP X${flips}! +${pts}`, ttl: 1.6 };
        }
        g.ang = target;
        g.spin = 0;
      }
    }
  };

  // bigger rider: red bike, spoked wheels, white-and-blue kit + helmet
  const drawBike = (ctx) => {
    ctx.save();
    ctx.translate(PX, g.py - 9);
    ctx.rotate(g.crashT > 0 ? g.crashT * 10 : g.ang);

    const wheel = (wx) => {
      ctx.fillStyle = C64.black;
      ctx.beginPath();
      ctx.arc(wx, 7, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C64.lightgrey;
      ctx.beginPath();
      ctx.arc(wx, 7, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C64.darkgrey;
      ctx.lineWidth = 1;
      const a = g.pedal;
      ctx.beginPath();
      ctx.moveTo(wx - Math.cos(a) * 3.5, 7 - Math.sin(a) * 3.5);
      ctx.lineTo(wx + Math.cos(a) * 3.5, 7 + Math.sin(a) * 3.5);
      ctx.moveTo(wx - Math.sin(a) * 3.5, 7 + Math.cos(a) * 3.5);
      ctx.lineTo(wx + Math.sin(a) * 3.5, 7 - Math.cos(a) * 3.5);
      ctx.stroke();
      ctx.fillStyle = C64.black;
      ctx.beginPath();
      ctx.arc(wx, 7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };
    wheel(-9);
    wheel(9);

    // red frame
    ctx.strokeStyle = '#d43d1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 7);
    ctx.lineTo(-1, 1);
    ctx.lineTo(9, 7);
    ctx.moveTo(-1, 1);
    ctx.lineTo(2, 6);
    ctx.moveTo(9, 7);
    ctx.lineTo(8, -1);
    ctx.stroke();

    // rider: blue legs, white jersey with blue sleeve, helmet
    ctx.fillStyle = '#2929c7';
    ctx.fillRect(-2, -2, 3, 7);
    ctx.fillRect(2, -3, 3, 7);
    ctx.fillStyle = C64.white;
    ctx.fillRect(-2, -10, 7, 8);
    ctx.fillStyle = '#2929c7';
    ctx.fillRect(3, -9, 5, 3);
    ctx.fillStyle = C64.orange;
    ctx.fillRect(6, -7, 3, 2);
    ctx.fillRect(0, -14, 4, 4);
    ctx.fillStyle = C64.white;
    ctx.fillRect(-1, -16, 6, 3);
    ctx.restore();
  };

  const drawScenery = (ctx) => {
    // trees on the field, scrolling at 0.6x for light parallax
    const span = W + 80;
    for (let i = 0; i < 4; i += 1) {
      const sx = ((((i * 260 - g.wx * 0.6) % span) + span) % span) - 40;
      const ty = HORIZON + 22 + hash(i * 11.3) * 30;
      ctx.fillStyle = '#7a4a1c';
      ctx.fillRect(sx, ty, 3, 9);
      ctx.fillStyle = C64.green;
      ctx.fillRect(sx - 5, ty - 8, 13, 8);
      ctx.fillRect(sx - 2, ty - 12, 7, 5);
      ctx.fillStyle = C64.lightgreen;
      ctx.fillRect(sx - 3, ty - 10, 4, 3);
    }

    // spectators standing near the track
    const SHIRTS = ['#2929c7', '#d43d1a', C64.white];
    for (let i = 0; i < 3; i += 1) {
      const sx = ((i * 420 + 200 - g.wx) % (W + 200) + (W + 200)) % (W + 200) - 60;
      if (sx < -10 || sx > W + 10) continue;
      const wxAt = g.wx + sx;
      const sy = groundY(wxAt) - 1;
      if (sy < HORIZON + 20) continue;
      ctx.fillStyle = C64.black;
      ctx.fillRect(sx, sy - 4, 2, 4);
      ctx.fillRect(sx + 3, sy - 4, 2, 4);
      ctx.fillStyle = SHIRTS[i % 3];
      ctx.fillRect(sx - 1, sy - 10, 7, 6);
      ctx.fillStyle = C64.orange;
      ctx.fillRect(sx + 1, sy - 14, 4, 4);
    }
  };

  const draw = (ctx) => {
    // sky strip + rocky ridge on the horizon
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, HORIZON);
    for (let x = 0; x < W; x += 1) {
      const r = HORIZON - 8 - hash(Math.floor((g.wx * 0.2 + x) / 3)) * 7;
      ctx.fillStyle = RIDGE_DARK;
      ctx.fillRect(x, r, 1, HORIZON - r);
      ctx.fillStyle = RIDGE;
      ctx.fillRect(x, r + 2, 1, HORIZON - r - 2);
    }

    // field + dirt track, column by column
    for (let x = 0; x < W; x += 1) {
      const wxc = g.wx + x;
      const gy = groundY(wxc);
      ctx.fillStyle = FIELD;
      ctx.fillRect(x, HORIZON, 1, gy - HORIZON);
      // corduroy dirt: alternating vertical stripes, like cut cliff faces
      const stripe = Math.floor(wxc / 4) % 2 === 0;
      ctx.fillStyle = DIRT_LINE;
      ctx.fillRect(x, gy - 2, 1, 2);
      ctx.fillStyle = stripe ? DIRT : DIRT_DARK;
      ctx.fillRect(x, gy, 1, H - gy);
    }

    // field speckles: fallen leaves
    for (let i = 0; i < 90; i += 1) {
      const sx = Math.floor(hash(i * 23.7) * W);
      const sy = HORIZON + Math.floor(hash(i * 51.1) * 60);
      if (sy < groundY(g.wx + sx) - 4) {
        ctx.fillStyle = i % 3 === 0 ? '#d43d1a' : FIELD_LIGHT;
        ctx.fillRect(sx, sy, 2, 1);
      }
    }

    drawScenery(ctx);

    // obstacles: tumbleweeds and rocks
    for (const o of g.obstacles) {
      const sx = o.x - g.wx;
      if (sx < -20 || sx > W + 20) continue;
      const gy = groundY(o.x);
      if (o.weed) {
        ctx.fillStyle = C64.green;
        ctx.beginPath();
        ctx.arc(sx, gy - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C64.lightgreen;
        for (let i = 0; i < 8; i += 1) {
          ctx.fillRect(sx - 4 + hash(i * 3.3 + o.x) * 8, gy - 8 + hash(i * 7.7) * 8, 1, 1);
        }
      } else {
        ctx.fillStyle = C64.darkgrey;
        ctx.fillRect(sx - o.w / 2, gy - o.h, o.w, o.h);
        ctx.fillStyle = C64.lightgrey;
        ctx.fillRect(sx - o.w / 2 + 1, gy - o.h + 1, 3, 2);
      }
    }

    // finish flag
    const fx = FINISH_M * PX_PER_M - g.wx + PX;
    if (fx < W + 20) {
      const gy = groundY(FINISH_M * PX_PER_M + PX);
      ctx.fillStyle = C64.white;
      ctx.fillRect(fx, gy - 34, 2, 34);
      ctx.fillStyle = '#d43d1a';
      ctx.fillRect(fx + 2, gy - 34, 12, 8);
    }

    drawBike(ctx);

    if (g.popup) hudText(ctx, g.popup.text, W / 2 - 54, 50, C64.white);

    // HUD, reference style
    hudBox(ctx, `BMX ${Math.min(FINISH_M, Math.round(g.wx / PX_PER_M))}M`, W / 2);
    for (let i = 0; i < g.lives; i += 1) {
      ctx.fillStyle = '#d43d1a';
      ctx.fillRect(W - 20 - i * 14, 8, 10, 2);
      ctx.fillStyle = C64.black;
      ctx.fillRect(W - 20 - i * 14, 10, 3, 3);
      ctx.fillRect(W - 13 - i * 14, 10, 3, 3);
    }
    statusBar(ctx, 'UP JUMPS · L/R FLIPS · ESC QUITS', `${score()}`);
  };

  return { update, draw, score };
}
